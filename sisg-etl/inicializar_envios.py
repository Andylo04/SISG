import argparse

from dotenv import load_dotenv
from sqlalchemy import text

from config.database import source_engine
from load import control_envios

load_dotenv()


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--hosp-hasta", type=int, help="marcar hospitalizaciones con id <= N")
    ap.add_argument("--cons-hasta", type=int, help="marcar consultas con id <= N")
    a = ap.parse_args(argv)

    eng = source_engine()
    try:
        with eng.connect() as conn:
            max_h = conn.execute(text("SELECT COALESCE(MAX(hospitalizacion_id), 0) FROM hospitalizacion")).scalar()
            max_c = conn.execute(text("SELECT COALESCE(MAX(consulta_id), 0) FROM consulta")).scalar()
            if a.hosp_hasta is None or a.cons_hasta is None:
                print(f"Id máximo de hospitalizacion: {max_h}\nId máximo de consulta: {max_c}")
                print("Vuelve a correr indicando hasta qué id ya se envió, por ejemplo:\n"
                      f"  python inicializar_envios.py --hosp-hasta {max_h} --cons-hasta {max_c}")
                return
            h = [r[0] for r in conn.execute(text(
                "SELECT hospitalizacion_id FROM hospitalizacion WHERE hospitalizacion_id <= :n"), {"n": a.hosp_hasta})]
            c = [r[0] for r in conn.execute(text(
                "SELECT consulta_id FROM consulta WHERE consulta_id <= :n"), {"n": a.cons_hasta})]
    finally:
        eng.dispose()

    control_envios.registrar_muchos("HOSP", h)
    control_envios.registrar_muchos("CONS", c)
    print(f"Marcadas como ya enviadas: {len(h)} hospitalizaciones y {len(c)} consultas.")


if __name__ == "__main__":
    main()