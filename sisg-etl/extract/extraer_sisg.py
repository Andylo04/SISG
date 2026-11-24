
import re
import pandas as pd
from sqlalchemy import text
from config.database import source_engine

_IDENTIFICADOR = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


def extraer_tabla_local(tabla, limite=None):
    """Extrae una tabla local confirmada. No ejecuta escrituras."""

    if not _IDENTIFICADOR.fullmatch(tabla or ""):
        raise ValueError("Nombre de tabla inválido.")

    sql = f"SELECT * FROM `{tabla}`"

    if limite is not None:
        if not isinstance(limite, int) or limite < 1:
            raise ValueError("limite debe ser entero positivo.")
        sql += f" LIMIT {limite}"

    engine = source_engine()

    try:
        with engine.connect() as conn:
            return pd.read_sql(text(sql), conn)
    finally:
        engine.dispose()


def extraer_hospitales_local():
    """
    Extrae los hospitales de la base operacional SISG.
    No modifica los registros originales.
    """

    consulta = text("""
        SELECT
            hospital_id,
            codigo_establecimiento,
            nombre,
            nit,
            tipo_hospital,
            num_camas,
            municipio_id,
            direccion,
            telefono,
            activo
        FROM hospital_privado
        ORDER BY hospital_id
    """)

    engine = source_engine()

    try:
        with engine.connect() as conn:
            hospitales = pd.read_sql(consulta, conn)

        print(f"Hospitales extraídos desde SISG: {len(hospitales)}")

        return hospitales

    finally:
        engine.dispose()
