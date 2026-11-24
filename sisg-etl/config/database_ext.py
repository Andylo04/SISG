"""Compatibilidad: mantiene los nombres de conexión usados por los módulos ETL."""
from config.database import source_engine, target_engine

def dw_engine():
    return target_engine()
