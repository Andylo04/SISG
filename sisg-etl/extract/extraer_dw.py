import os
import re

import pandas as pd
from dotenv import load_dotenv
from sqlalchemy import text

from config.database import target_engine

load_dotenv()

CLAVE_HECHO = ["sk_tiempo", "sk_establecimiento", "sk_geografia", "sk_diagnostico"]


def _validar_identificador(nombre):
    if not nombre or not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", nombre):
        raise ValueError(f"Nombre SQL no válido: {nombre!r}")
    return nombre


def extraer_atenciones_dw():
    """Hechos que el DW ya tiene para el Grupo 1 (vista de solo lectura)."""
    vista = _validar_identificador(os.getenv("DW_FACT_VIEW", "vw_g1_fact_atencion_privada"))
    engine = target_engine()
    try:
        with engine.connect() as conn:
            return pd.read_sql(text(f"SELECT * FROM `{vista}`"), conn)
    finally:
        engine.dispose()
