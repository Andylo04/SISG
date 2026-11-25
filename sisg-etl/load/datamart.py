"""Carga el Data Mart local del Grupo 1 (SQLite por defecto)."""
from datetime import datetime

import pandas as pd

from config.database import datamart_engine


def cargar_datamart(fact_enriquecido, catalogos, resumen):
    engine = datamart_engine()
    try:
        with engine.begin() as conn:
            fact_enriquecido.to_sql("dm_fact_atencion", conn, if_exists="replace", index=False)
            for nombre, cat in catalogos.items():
                if cat is not None and not cat.empty:
                    cat.to_sql(f"dm_dim_{nombre}", conn, if_exists="replace", index=False)
            log = pd.DataFrame([{**resumen, "fecha_ejecucion": datetime.now().isoformat(timespec="seconds")}])
            log.to_sql("etl_log", conn, if_exists="append", index=False)
        print(f"Data Mart actualizado: {engine.url}")
    finally:
        engine.dispose()
