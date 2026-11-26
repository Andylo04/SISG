import re

import pandas as pd
from sqlalchemy import text

from config.database import source_engine

# Hospital seleccionado para la demostración
HOSPITAL_ID = 6

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
    """Extrae únicamente Hospital Centro Médico."""
    consulta = text("""
        SELECT
            h.hospital_id,
            h.codigo_establecimiento,
            h.nombre,
            h.tipo_hospital,
            h.municipio_id,
            m.codigo_ine,
            m.nombre AS municipio,
            h.activo
        FROM hospital_privado h
        LEFT JOIN municipio m
            ON m.municipio_id = h.municipio_id
        WHERE h.hospital_id = :hospital_id
        ORDER BY h.hospital_id
    """)

    engine = source_engine()
    try:
        with engine.connect() as conn:
            df = pd.read_sql(
                consulta,
                conn,
                params={"hospital_id": HOSPITAL_ID}
            )

        print(f"Hospitales extraídos desde SISG: {len(df)}")
        return df
    finally:
        engine.dispose()


_SQL_CONSULTAS = """
    SELECT
        (YEAR(c.fecha_hora) * 10000
         + MONTH(c.fecha_hora) * 100 + 1) AS sk_tiempo,
        c.hospital_id,
        cd.cie10_codigo AS cie10,
        COUNT(*) AS atenciones,
        0 AS dias_estancia,
        COALESCE(SUM(c.monto_facturado), 0) AS monto_cobrado
    FROM consulta c
    LEFT JOIN consulta_diagnostico cd
        ON cd.consulta_id = c.consulta_id
        AND cd.es_principal = 1
    WHERE c.hospital_id = :hospital_id
      AND c.estado = :estado
    GROUP BY 1, c.hospital_id, cd.cie10_codigo
"""


_SQL_HOSPITALIZACIONES = """
    SELECT
        (YEAR(x.fecha_ingreso) * 10000
         + MONTH(x.fecha_ingreso) * 100 + 1) AS sk_tiempo,
        x.hospital_id,
        x.cie10_ingreso AS cie10,
        COUNT(*) AS atenciones,
        COALESCE(
            SUM(
                GREATEST(
                    DATEDIFF(
                        COALESCE(x.fecha_egreso, x.fecha_ingreso),
                        x.fecha_ingreso
                    ), 0
                )
            ), 0
        ) AS dias_estancia,
        COALESCE(SUM(x.monto_facturado), 0) AS monto_cobrado
    FROM hospitalizacion x
    WHERE x.hospital_id = :hospital_id
    GROUP BY 1, x.hospital_id, x.cie10_ingreso
"""


def extraer_hechos_locales(
    estado_consulta="ATENDIDA",
    hospital_id=HOSPITAL_ID
):
    """
    Extrae hechos agregados exclusivamente del hospital seleccionado.

    Consultas atendidas:
        Cada consulta = 1 atención y 0 días de estancia.

    Hospitalizaciones:
        Cada hospitalización = 1 atención con sus días de estancia.
    """

    engine = source_engine()

    try:
        with engine.connect() as conn:

            cons = pd.read_sql(
                text(_SQL_CONSULTAS),
                conn,
                params={
                    "estado": estado_consulta,
                    "hospital_id": hospital_id
                }
            )

            hosp = pd.read_sql(
                text(_SQL_HOSPITALIZACIONES),
                conn,
                params={"hospital_id": hospital_id}
            )

    finally:
        engine.dispose()

    print(
        f"Consultas agregadas: {len(cons)} grupos | "
        f"Hospitalizaciones agregadas: {len(hosp)} grupos"
    )

    return pd.concat([cons, hosp], ignore_index=True)


def extraer_registros_locales(
    estado_consulta="ATENDIDA",
    solo_egresadas=True,
    hospital_id=HOSPITAL_ID
):
    """
    Un registro por hospitalización / consulta (sin agrupar), con su id de origen.

    Devuelve: tipo, origen_id, sk_tiempo, hospital_id, cie10,
              atenciones, dias_estancia, monto_cobrado
    """
    filtro_egreso = "AND x.fecha_egreso IS NOT NULL" if solo_egresadas else ""

    sql_h = f"""
        SELECT
            'HOSP' AS tipo,
            x.hospitalizacion_id AS origen_id,
            (YEAR(x.fecha_ingreso) * 10000
             + MONTH(x.fecha_ingreso) * 100 + 1) AS sk_tiempo,
            x.hospital_id,
            x.cie10_ingreso AS cie10,
            1 AS atenciones,
            GREATEST(
                DATEDIFF(
                    COALESCE(x.fecha_egreso, x.fecha_ingreso),
                    x.fecha_ingreso
                ), 0
            ) AS dias_estancia,
            COALESCE(x.monto_facturado, 0) AS monto_cobrado
        FROM hospitalizacion x
        WHERE x.hospital_id = :hospital_id
          {filtro_egreso}
    """

    sql_c = """
        SELECT
            'CONS' AS tipo,
            c.consulta_id AS origen_id,
            (YEAR(c.fecha_hora) * 10000
             + MONTH(c.fecha_hora) * 100 + 1) AS sk_tiempo,
            c.hospital_id,
            (SELECT MIN(cd.cie10_codigo)
               FROM consulta_diagnostico cd
              WHERE cd.consulta_id = c.consulta_id
                AND cd.es_principal = 1) AS cie10,
            1 AS atenciones,
            0 AS dias_estancia,
            COALESCE(c.monto_facturado, 0) AS monto_cobrado
        FROM consulta c
        WHERE c.hospital_id = :hospital_id
          AND c.estado = :estado
    """

    estado = estado_consulta or "ATENDIDA"
    engine = source_engine()
    try:
        with engine.connect() as conn:
            h = pd.read_sql(text(sql_h), conn, params={"hospital_id": hospital_id})
            c = pd.read_sql(
                text(sql_c), conn,
                params={"hospital_id": hospital_id, "estado": estado}
            )
            abiertas = 0
            if solo_egresadas:
                abiertas = conn.execute(
                    text("SELECT COUNT(*) FROM hospitalizacion "
                         "WHERE hospital_id = :hospital_id AND fecha_egreso IS NULL"),
                    {"hospital_id": hospital_id}
                ).scalar()
    finally:
        engine.dispose()

    if solo_egresadas and abiertas:
        print(f"Hospitalizaciones sin egreso (no se envían todavía): {abiertas}")

    return pd.concat([h, c], ignore_index=True)