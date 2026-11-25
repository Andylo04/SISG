import re

import pandas as pd
from sqlalchemy import text

from config.database import source_engine

_IDENTIFICADOR = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")


def extraer_tabla_local(tabla, limite=None):
    """Extrae una tabla local. Solo lectura."""
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
    """Hospitales de la base operacional SISG, con código INE de su municipio."""
    consulta = text("""
        SELECT h.hospital_id, h.codigo_establecimiento, h.nombre, h.tipo_hospital,
               h.municipio_id, m.codigo_ine, m.nombre AS municipio, h.activo
        FROM hospital_privado h
        LEFT JOIN municipio m ON m.municipio_id = h.municipio_id
        ORDER BY h.hospital_id
    """)
    engine = source_engine()
    try:
        with engine.connect() as conn:
            df = pd.read_sql(consulta, conn)
        print(f"Hospitales extraídos desde SISG: {len(df)}")
        return df
    finally:
        engine.dispose()


# Se evita DATE_FORMAT/% para no tener problemas de escape con PyMySQL.
_SQL_CONSULTAS = """
    SELECT (YEAR(c.fecha_hora) * 10000 + MONTH(c.fecha_hora) * 100 + 1) AS sk_tiempo,
           c.hospital_id,
           cd.cie10_codigo AS cie10,
           COUNT(*) AS atenciones,
           0 AS dias_estancia,
           COALESCE(SUM(c.monto_facturado), 0) AS monto_cobrado
    FROM consulta c
    LEFT JOIN consulta_diagnostico cd
           ON cd.consulta_id = c.consulta_id AND cd.es_principal = 1
    {filtro}
    GROUP BY 1, c.hospital_id, cd.cie10_codigo
"""

_SQL_HOSPITALIZACIONES = """
    SELECT (YEAR(x.fecha_ingreso) * 10000 + MONTH(x.fecha_ingreso) * 100 + 1) AS sk_tiempo,
           x.hospital_id,
           x.cie10_ingreso AS cie10,
           COUNT(*) AS atenciones,
           COALESCE(SUM(GREATEST(DATEDIFF(COALESCE(x.fecha_egreso, x.fecha_ingreso),
                                          x.fecha_ingreso), 0)), 0) AS dias_estancia,
           COALESCE(SUM(x.monto_facturado), 0) AS monto_cobrado
    FROM hospitalizacion x
    GROUP BY 1, x.hospital_id, x.cie10_ingreso
"""


def extraer_hechos_locales(estado_consulta="ATENDIDA"):
    """
    Hechos agregados por mes / hospital / diagnóstico desde SISG local:
      - cada consulta atendida = 1 atención (0 días de estancia)
      - cada hospitalización  = 1 atención con sus días de estancia
    Devuelve: sk_tiempo, hospital_id, cie10, atenciones, dias_estancia, monto_cobrado
    """
    filtro = ""
    params = {}
    if estado_consulta:
        filtro = "WHERE c.estado = :estado"
        params["estado"] = estado_consulta

    engine = source_engine()
    try:
        with engine.connect() as conn:
            cons = pd.read_sql(text(_SQL_CONSULTAS.format(filtro=filtro)), conn, params=params)
            hosp = pd.read_sql(text(_SQL_HOSPITALIZACIONES), conn)
    finally:
        engine.dispose()

    print(f"Consultas agregadas: {len(cons)} grupos | Hospitalizaciones agregadas: {len(hosp)} grupos")
    return pd.concat([cons, hosp], ignore_index=True)
