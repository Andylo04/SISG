
import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.engine import URL


# Localizar el .env en la raíz de sisg-etl
ROOT_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = ROOT_DIR / ".env"

load_dotenv(ENV_FILE, override=False)


def _obtener_variables_requeridas(variables, permitir_password_vacio=False):
    valores = {}

    for variable in variables:
        valor = os.getenv(variable)

        if valor is None:
            raise RuntimeError(
                f"Falta configurar {variable} en el archivo .env"
            )

        if variable.endswith("PASSWORD") and permitir_password_vacio:
            valores[variable] = valor
            continue

        if valor.strip() == "":
            raise RuntimeError(
                f"La variable {variable} está vacía en el archivo .env"
            )

        valores[variable] = valor

    return valores


def target_engine():
    """Conexión al Data Warehouse remoto."""

    variables = _obtener_variables_requeridas([
        "TARGET_DB_HOST",
        "TARGET_DB_PORT",
        "TARGET_DB_NAME",
        "TARGET_DB_USER",
        "TARGET_DB_PASSWORD",
    ])

    url = URL.create(
        "mysql+pymysql",
        username=variables["TARGET_DB_USER"],
        password=variables["TARGET_DB_PASSWORD"],
        host=variables["TARGET_DB_HOST"],
        port=int(variables["TARGET_DB_PORT"]),
        database=variables["TARGET_DB_NAME"],
        query={"charset": "utf8mb4"},
    )

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


def source_engine():
    """Conexión a la base operacional local SISG."""

    variables = _obtener_variables_requeridas(
        [
            "SOURCE_DB_HOST",
            "SOURCE_DB_PORT",
            "SOURCE_DB_NAME",
            "SOURCE_DB_USER",
            "SOURCE_DB_PASSWORD",
        ],
        permitir_password_vacio=True,
    )

    url = URL.create(
        "mysql+pymysql",
        username=variables["SOURCE_DB_USER"],
        password=variables["SOURCE_DB_PASSWORD"],
        host=variables["SOURCE_DB_HOST"],
        port=int(variables["SOURCE_DB_PORT"]),
        database=variables["SOURCE_DB_NAME"],
        query={"charset": "utf8mb4"},
    )

    return create_engine(
        url,
        pool_pre_ping=True,
        pool_recycle=1800,
    )


def datamart_engine():
    """Data Mart local del Grupo 1 (SQLite por defecto)."""
    url = os.getenv("DATAMART_URL", "sqlite:///datamart_g1.db").strip()
    return create_engine(url)
