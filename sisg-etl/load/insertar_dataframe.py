import re
import pandas as pd
from sqlalchemy import text
from config.database import target_engine

_IDENTIFICADOR = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

def insertar_dataframe(df: pd.DataFrame, tabla: str, columnas: list[str]):
    """
    Inserta en tabla física existente. Requiere tabla y columnas confirmadas.
    No crea, reemplaza ni trunca tablas. Usa transacción y parámetros.
    """
    if not _IDENTIFICADOR.fullmatch(tabla or ""):
        raise ValueError("Nombre de tabla física inválido o no configurado.")
    if not columnas or any(not _IDENTIFICADOR.fullmatch(c or "") for c in columnas):
        raise ValueError("Columnas de INSERT inválidas o no configuradas.")
    if df.empty:
        return 0

    faltantes = [c for c in columnas if c not in df.columns]
    if faltantes:
        raise ValueError(f"El DataFrame no contiene estas columnas: {faltantes}")

    nombres = ", ".join(f"`{c}`" for c in columnas)
    parametros = ", ".join(f":p{i}" for i in range(len(columnas)))
    sentencia = text(f"INSERT INTO `{tabla}` ({nombres}) VALUES ({parametros})")
    filas = [
        {f"p{i}": fila[c] for i, c in enumerate(columnas)}
        for _, fila in df[columnas].iterrows()
    ]

    engine = target_engine()
    try:
        with engine.begin() as conn:
            conn.execute(sentencia, filas)
        return len(filas)
    finally:
        engine.dispose()
