from sqlalchemy import text
from config.database import target_engine

def main():
    engine = target_engine()
    try:
        with engine.connect() as conexion:
            base, version = conexion.execute(
                text("SELECT DATABASE(), VERSION()")
            ).fetchone()
            print("¡CONEXIÓN EXITOSA!")
            print(f"Base de datos: {base}")
            print(f"Versión MySQL: {version}")
    finally:
        engine.dispose()

if __name__ == "__main__":
    main()
