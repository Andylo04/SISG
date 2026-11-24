import os
import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import text
from config.database import target_engine

load_dotenv()

CATALOGOS = {
    "establecimiento": "DW_CAT_ESTABLECIMIENTO_VIEW",
    "geografia": "DW_CAT_GEOGRAFIA_VIEW",
    "diagnostico": "DW_CAT_DIAGNOSTICO_VIEW",
    "actor": "DW_CAT_ACTOR_VIEW",
}

def extraer_catalogo(nombre):
    if nombre not in CATALOGOS:
        raise ValueError(f"Catálogo no permitido: {nombre}")
    vista = os.getenv(CATALOGOS[nombre])
    if not vista:
        raise RuntimeError(f"Falta {CATALOGOS[nombre]} en .env")
    if not vista.replace("_", "").isalnum():
        raise ValueError(f"Nombre SQL no válido: {vista!r}")

    engine = target_engine()
    try:
        with engine.connect() as conn:
            return pd.read_sql(text(f"SELECT * FROM `{vista}`"), conn)
    finally:
        engine.dispose()

def extraer_catalogos():
    resultado = {}
    for nombre in CATALOGOS:
        try:
            resultado[nombre] = extraer_catalogo(nombre)
            print(f"Catálogo {nombre}: {len(resultado[nombre])} filas")
        except Exception as error:
            print(f"Aviso: no se pudo extraer {nombre}: {error}")
            resultado[nombre] = pd.DataFrame()
    return resultado
