
import os
import re

import pandas as pd
from sqlalchemy import text

from config.database import target_engine


COLUMNAS_ESPERADAS = [
    "sk_tiempo",
    "sk_establecimiento",
    "sk_geografia",
    "sk_diagnostico",
    "atenciones",
    "dias_estancia",
    "monto_cobrado",
]

CATALOGOS = {
    "sk_tiempo": (
        "DW_CAT_TIEMPO_VIEW",
        "sk_tiempo",
    ),
    "sk_establecimiento": (
        "DW_CAT_ESTABLECIMIENTO_VIEW",
        "sk_establecimiento",
    ),
    "sk_geografia": (
        "DW_CAT_GEOGRAFIA_VIEW",
        "sk_geografia",
    ),
    "sk_diagnostico": (
        "DW_CAT_DIAGNOSTICO_VIEW",
        "sk_diagnostico",
    ),
}


def obtener_configuracion():
    tabla = os.getenv("DW_FACT_TABLE", "").strip()
    columnas_texto = os.getenv(
        "DW_FACT_INSERT_COLUMNS", ""
    ).strip()

    if not tabla or not columnas_texto:
        raise RuntimeError(
            "Configura DW_FACT_TABLE y "
            "DW_FACT_INSERT_COLUMNS en .env"
        )

    # Evitar nombres SQL arbitrarios en identificadores.
    if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", tabla):
        raise ValueError("Nombre de tabla no válido.")

    columnas = [
        columna.strip()
        for columna in columnas_texto.split(",")
        if columna.strip()
    ]

    if columnas != COLUMNAS_ESPERADAS:
        raise ValueError(
            "Las columnas configuradas en .env no coinciden "
            f"con las esperadas: {COLUMNAS_ESPERADAS}"
        )

    return tabla, columnas


def validar_catalogos(conexion, datos):
    """Comprueba que las claves existan en los catálogos del DW."""

    for columna, (variable, clave_catalogo) in CATALOGOS.items():
        vista = os.getenv(variable, "").strip()

        if not vista:
            raise RuntimeError(
                f"Falta configurar {variable} en .env"
            )

        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", vista):
            raise ValueError(
                f"Nombre de vista no válido: {vista}"
            )

        claves = datos[columna].drop_duplicates().tolist()

        consulta = text(
            f"SELECT `{clave_catalogo}` "
            f"FROM `{vista}` "
            f"WHERE `{clave_catalogo}` IN :claves"
        ).bindparams(
            __import__("sqlalchemy").bindparam(
                "claves", expanding=True
            )
        )

        existentes = {
            fila[0]
            for fila in conexion.execute(
                consulta,
                {"claves": claves},
            ).fetchall()
        }

        faltantes = set(claves) - existentes

        if faltantes:
            raise ValueError(
                f"Claves inexistentes en {vista}, "
                f"columna {clave_catalogo}: {sorted(faltantes)}"
            )

        print(
            f"Catálogo {vista}: "
            f"{len(claves)} claves verificadas."
        )


def insertar_atenciones(df):
    if df.empty:
        print("No hay registros para insertar.")
        return 0

    tabla, columnas = obtener_configuracion()

    faltantes = [
        columna for columna in columnas
        if columna not in df.columns
    ]

    if faltantes:
        raise ValueError(
            f"Faltan columnas en el DataFrame: {faltantes}"
        )

    datos = df[columnas].copy()

    if datos.isnull().any().any():
        raise ValueError(
            "Hay valores nulos en las columnas obligatorias."
        )

    columnas_enteras = [
        "sk_tiempo",
        "sk_establecimiento",
        "sk_geografia",
        "sk_diagnostico",
        "atenciones",
        "dias_estancia",
    ]

    for columna in columnas_enteras:
        valores = pd.to_numeric(
            datos[columna], errors="raise"
        )

        if (valores % 1 != 0).any():
            raise ValueError(
                f"La columna {columna} contiene valores no enteros."
            )

        datos[columna] = valores.astype("int64")

    datos["monto_cobrado"] = pd.to_numeric(
        datos["monto_cobrado"],
        errors="raise",
    )

    if (datos["atenciones"] < 0).any():
        raise ValueError("Las atenciones no pueden ser negativas.")

    if (datos["dias_estancia"] < 0).any():
        raise ValueError("Los días de estancia no pueden ser negativos.")

    if (datos["monto_cobrado"] < 0).any():
        raise ValueError("El monto cobrado no puede ser negativo.")

    # Evitar filas repetidas dentro del mismo archivo.
    datos = datos.drop_duplicates(
        subset=columnas
    ).copy()

    engine = target_engine()

    insertados = 0
    duplicados = 0

    columnas_sql = ", ".join(
        f"`{columna}`" for columna in columnas
    )

    parametros_sql = ", ".join(
        f":{columna}" for columna in columnas
    )

    consulta_duplicado = text(f"""
        SELECT COUNT(*)
        FROM `{tabla}`
        WHERE
            sk_tiempo = :sk_tiempo
            AND sk_establecimiento = :sk_establecimiento
            AND sk_geografia = :sk_geografia
            AND sk_diagnostico = :sk_diagnostico
            AND atenciones = :atenciones
            AND dias_estancia = :dias_estancia
            AND monto_cobrado = :monto_cobrado
    """)

    consulta_insert = text(f"""
        INSERT INTO `{tabla}` ({columnas_sql})
        VALUES ({parametros_sql})
    """)

    try:
        with engine.begin() as conexion:

            print("\nValidando claves de catálogos...")
            validar_catalogos(conexion, datos)

            print("\nIniciando carga...")

            for registro in datos.to_dict(orient="records"):

                existe = conexion.execute(
                    consulta_duplicado,
                    registro,
                ).scalar_one()

                if existe:
                    duplicados += 1
                    continue

                conexion.execute(
                    consulta_insert,
                    registro,
                )

                insertados += 1

        print("\nCarga finalizada correctamente.")
        print(f"Insertados: {insertados}")
        print(f"Duplicados omitidos: {duplicados}")

        return insertados

    finally:
        engine.dispose()
