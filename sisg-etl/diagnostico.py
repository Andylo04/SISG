"""Ejecuta:  python diagnostico.py   y envíame la salida completa si algo falla."""
import importlib
import os
import sys

from dotenv import load_dotenv
from sqlalchemy import text

load_dotenv()
ok = lambda m: print(f"  [OK]    {m}")
mal = lambda m: print(f"  [ERROR] {m}")


def paso(titulo):
    print(f"\n== {titulo}")


paso("1. Python y librerías")
print(f"  Python {sys.version.split()[0]}")
for mod in ["pandas", "sqlalchemy", "pymysql", "cryptography", "dotenv"]:
    try:
        m = importlib.import_module(mod)
        ok(f"{mod} {getattr(m, '__version__', '')}")
    except Exception as e:
        mal(f"{mod}: {e}  -> pip install -r requirements.txt")

paso("2. Variables .env")
for v in ["TARGET_DB_HOST", "TARGET_DB_PORT", "TARGET_DB_NAME", "TARGET_DB_USER", "TARGET_DB_PASSWORD",
          "SOURCE_DB_HOST", "SOURCE_DB_NAME", "SOURCE_DB_USER", "DW_FACT_VIEW", "DW_FACT_TABLE"]:
    val = os.getenv(v)
    (ok if val else mal)(f"{v} {'definida' if val else 'FALTA'}")
print(f"  ETL_ENABLE_LOAD={os.getenv('ETL_ENABLE_LOAD')}")

from config.database import source_engine, target_engine  # noqa: E402

paso("3. DW remoto (Railway)")
try:
    eng = target_engine()
    with eng.connect() as c:
        ok(f"Conectado a {c.execute(text('SELECT DATABASE()')).scalar()}")
        try:
            for g in c.execute(text("SHOW GRANTS FOR CURRENT_USER()")).fetchall():
                print("   GRANT:", g[0])
        except Exception as e:
            mal(f"SHOW GRANTS: {e}")
        vistas = ["DW_FACT_VIEW", "DW_CAT_TIEMPO_VIEW", "DW_CAT_ESTABLECIMIENTO_VIEW",
                  "DW_CAT_GEOGRAFIA_VIEW", "DW_CAT_DIAGNOSTICO_VIEW", "DW_CAT_ACTOR_VIEW"]
        for var in vistas:
            v = os.getenv(var)
            try:
                n = c.execute(text(f"SELECT COUNT(*) FROM `{v}`")).scalar()
                cols = [r[0] for r in c.execute(text(f"SHOW COLUMNS FROM `{v}`")).fetchall()]
                ok(f"{v}: {n} filas | columnas: {', '.join(cols)}")
            except Exception as e:
                mal(f"{v}: {getattr(e, 'orig', e)}")
        t = os.getenv("DW_FACT_TABLE")
        try:
            c.execute(text(f"SELECT 1 FROM `{t}` LIMIT 1"))
            ok(f"SELECT sobre buzón {t} permitido")
        except Exception as e:
            print(f"  [INFO]  SELECT sobre buzón {t} NO permitido (normal, es solo-INSERT): {getattr(e, 'orig', e)}")
except Exception as e:
    mal(f"No se pudo conectar al DW: {getattr(e, 'orig', e)}")

paso("4. SISG local")
try:
    eng = source_engine()
    with eng.connect() as c:
        ok(f"Conectado a {c.execute(text('SELECT DATABASE()')).scalar()}")
        for t in ["hospital_privado", "municipio", "consulta", "consulta_diagnostico",
                  "hospitalizacion", "diagnostico_catalogo"]:
            try:
                ok(f"{t}: {c.execute(text(f'SELECT COUNT(*) FROM `{t}`')).scalar()} filas")
            except Exception as e:
                mal(f"{t}: {getattr(e, 'orig', e)}")
except Exception as e:
    mal(f"No se pudo conectar a SISG local: {getattr(e, 'orig', e)}")
print("\nListo.")
