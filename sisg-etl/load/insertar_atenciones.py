"""
LOAD hacia el buzón ingesta_g1_atencion.

Reglas (según la guía de ingesta):
  * Solo se hace INSERT en el buzón; el trigger del servidor lo refleja en el DW.
  * El usuario del grupo NO necesariamente puede hacer SELECT sobre el buzón,
    así que NO se consulta ese buzón: los duplicados se detectan contra la vista
    de hechos (vw_g1_fact_atencion_privada).
  * Cada fila va en su propia transacción: si el trigger rechaza una, las demás
    siguen y el motivo queda en el reporte.
"""
import os
import re

import pandas as pd
from sqlalchemy import text

from config.database import target_engine
from extract.extraer_dw import CLAVE_HECHO, extraer_atenciones_dw

COLUMNAS = ["sk_tiempo", "sk_establecimiento", "sk_geografia", "sk_diagnostico",
            "atenciones", "dias_estancia", "monto_cobrado"]
_ID = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def _tabla_destino():
    tabla = os.getenv("DW_FACT_TABLE", "ingesta_g1_atencion").strip()
    if not _ID.fullmatch(tabla):
        raise ValueError("DW_FACT_TABLE no válido.")
    return tabla


def separar_ya_existentes(df):
    """(nuevos, existentes) comparando la llave de 4 columnas contra la vista del DW."""
    dw = extraer_atenciones_dw()
    if dw.empty:
        return df.copy(), df.iloc[0:0].copy()
    llaves_dw = set(map(tuple, dw[CLAVE_HECHO].astype(int).itertuples(index=False, name=None)))
    mask = [tuple(int(v) for v in fila) in llaves_dw
            for fila in df[CLAVE_HECHO].itertuples(index=False, name=None)]
    mask = pd.Series(mask, index=df.index)
    return df.loc[~mask].copy(), df.loc[mask].copy()


def insertar_atenciones(df, simular=False):
    """Devuelve (insertados, fallidos_df, existentes_df)."""
    vacio = pd.DataFrame()
    if df.empty:
        print("No hay registros para insertar.")
        return 0, vacio, vacio

    tabla = _tabla_destino()
    datos = df[COLUMNAS].copy()
    nuevos, existentes = separar_ya_existentes(datos)
    print(f"Ya existen en el DW (se omiten): {len(existentes)} | Nuevos a insertar: {len(nuevos)}")

    if simular:
        print("SIMULACIÓN: no se inserta nada. Primeras filas que se insertarían:")
        print(nuevos.head(10).to_string(index=False))
        return 0, vacio, existentes

    sql = text(
        f"INSERT INTO `{tabla}` ({', '.join(f'`{c}`' for c in COLUMNAS)}) "
        f"VALUES ({', '.join(f':{c}' for c in COLUMNAS)})"
    )
    insertados, fallidos = 0, []
    engine = target_engine()
    try:
        for fila in nuevos.to_dict(orient="records"):
            fila = {k: (float(v) if k == "monto_cobrado" else int(v)) for k, v in fila.items()}
            try:
                with engine.begin() as conn:
                    conn.execute(sql, fila)
                insertados += 1
            except Exception as e:  # trigger / permisos / FK
                fallidos.append({**fila, "error": str(getattr(e, "orig", e))[:300]})
    finally:
        engine.dispose()

    fallidos_df = pd.DataFrame(fallidos)
    print(f"Insertados: {insertados} | Fallidos: {len(fallidos_df)}")
    return insertados, fallidos_df, existentes
