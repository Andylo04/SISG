import os
from dotenv import load_dotenv
from load.insertar_dataframe import insertar_dataframe

load_dotenv()

def insertar_aseguradoras(df):
    tabla = os.getenv("DW_INSURER_TABLE", "").strip()
    texto_columnas = os.getenv("DW_INSURER_INSERT_COLUMNS", "").strip()
    if not tabla or not texto_columnas:
        raise RuntimeError(
            "INSERT de aseguradoras detenido: confirma si el DW tiene una tabla "
            "física de destino, sus columnas y reglas de duplicados."
        )
    columnas = [c.strip() for c in texto_columnas.split(",") if c.strip()]
    return insertar_dataframe(df, tabla, columnas)
