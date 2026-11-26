"""
LOAD hacia el buzón ingesta_g1_atencion.

Reglas (según la guía de ingesta):
  * Solo se hace INSERT en el buzón; el trigger del servidor lo refleja en el DW.
  * Los duplicados se detectan contra la vista de hechos Y contra el propio buzón
    (el DW procesa el buzón de forma diferida, así que la vista aún no lo refleja).
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


def _llaves_buzon():
    """Llaves ya enviadas al buzón (incluye las aún no procesadas por el DW)."""
    tabla = _tabla_destino()
    engine = target_engine()
    try:
        with engine.connect() as conn:
            b = pd.read_sql(text(f"SELECT {', '.join(CLAVE_HECHO)} FROM `{tabla}`"), conn)
    finally:
        engine.dispose()
    return set(map(tuple, b.astype(int).itertuples(index=False, name=None))) if not b.empty else set()


def separar_ya_existentes(df):
    """
    (nuevos, existentes). Una fila ya existe si su llave de 4 columnas está en la
    vista de hechos O en el buzón. El buzón es imprescindible: el DW procesa sus
    filas de forma diferida (procesado_etl), y mientras tanto la vista no las muestra.
    """
    llaves = _llaves_buzon()
    dw = extraer_atenciones_dw()
    if not dw.empty:
        llaves |= set(map(tuple, dw[CLAVE_HECHO].astype(int).itertuples(index=False, name=None)))
    if not llaves:
        return df.copy(), df.iloc[0:0].copy()
    mask = pd.Series([tuple(int(v) for v in fila) in llaves
                      for fila in df[CLAVE_HECHO].itertuples(index=False, name=None)], index=df.index)
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