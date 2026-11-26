import os
from datetime import datetime

from sqlalchemy import create_engine, text


def _engine():
    return create_engine(os.getenv("CONTROL_URL", "sqlite:///control_envios.db").strip())


def _crear(conn):
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS etl_enviados (
            tipo TEXT NOT NULL,
            origen_id INTEGER NOT NULL,
            origen TEXT NOT NULL,
            fecha_envio TEXT NOT NULL,
            PRIMARY KEY (tipo, origen_id)
        )"""))


def ids_enviados():
    eng = _engine()
    try:
        with eng.begin() as conn:
            _crear(conn)
            filas = conn.execute(text("SELECT tipo, origen_id FROM etl_enviados")).fetchall()
        return {(t, int(i)) for t, i in filas}
    finally:
        eng.dispose()


def registrar(tipo, origen_id, origen="etl"):
    eng = _engine()
    try:
        with eng.begin() as conn:
            _crear(conn)
            conn.execute(
                text("INSERT OR IGNORE INTO etl_enviados (tipo, origen_id, origen, fecha_envio) "
                     "VALUES (:t, :i, :o, :f)"),
                {"t": tipo, "i": int(origen_id), "o": origen,
                 "f": datetime.now().isoformat(timespec="seconds")})
    finally:
        eng.dispose()


def registrar_muchos(tipo, ids, origen="baseline"):
    for i in ids:
        registrar(tipo, i, origen)