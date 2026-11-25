import os
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from extract.extraer_catalogos import extraer_catalogos
from extract.extraer_sisg import extraer_hechos_locales, extraer_hospitales_local
from load.datamart import cargar_datamart
from load.insertar_atenciones import insertar_atenciones
from transform.enriquecer_datos import enriquecer_atenciones
from transform.mapear_claves import aplicar_mapeos
from transform.transformar_datos import transformar_dataframe

load_dotenv()
REPORTS = Path("reports")
REPORTS.mkdir(exist_ok=True)


def guardar(df, nombre):
    if df is not None and not df.empty:
        df.to_csv(REPORTS / nombre, index=False, encoding="utf-8-sig")


def main():
    print("=" * 58)
    print("SISG ETL - GRUPO 1 | SISG local -> Data Mart -> DW")
    print("=" * 58)

    print("\n[1/5] EXTRACT: base operacional SISG (local)...")
    hospitales = extraer_hospitales_local()
    hechos = extraer_hechos_locales(os.getenv("ETL_ESTADO_CONSULTA", "ATENDIDA").strip() or None)
    guardar(hechos, "1_hechos_origen.csv")
    if hechos.empty:
        print("SISG local no tiene consultas ni hospitalizaciones. Nada que procesar.")
        return

    print("\n[2/5] EXTRACT: catálogos del DW (vw_cat_*)...")
    catalogos = extraer_catalogos()

    print("\n[3/5] TRANSFORM: mapeo a llaves sk_* y validación...")
    mapeados, revision = aplicar_mapeos(hechos, hospitales, catalogos)
    guardar(revision, "2_revision_establecimientos.csv")
    sin_match = revision[revision["sk_establecimiento"] == -1]
    if not sin_match.empty:
        print(f"AVISO: {len(sin_match)} hospital(es) sin equivalente en el DW (irán como -1). "
              f"Revisa reports/2_revision_establecimientos.csv y completa config/mapeo_establecimiento.csv")
    validos, rechazados = transformar_dataframe(mapeados, catalogos)
    guardar(rechazados, "3_rechazados.csv")
    enriquecidos = enriquecer_atenciones(validos, catalogos)
    guardar(enriquecidos, "3_atenciones_enriquecidas.csv")
    print(f"Válidos: {len(validos)} | Rechazados: {len(rechazados)}")
    if not rechazados.empty:
        print(rechazados["motivo_rechazo"].value_counts().to_string())

    print("\n[4/5] LOAD: Data Mart local...")
    resumen = {"extraidos": len(mapeados), "validos": len(validos), "rechazados": len(rechazados)}
    cargar_datamart(enriquecidos, catalogos, resumen)

    print("\n[5/5] LOAD: buzón del DW (ingesta_g1_atencion)...")
    activar = os.getenv("ETL_ENABLE_LOAD", "false").strip().lower() == "true"
    insertados, fallidos, existentes = insertar_atenciones(validos, simular=not activar)
    guardar(fallidos, "4_fallidos_carga.csv")
    if not activar:
        print("(Modo simulación. Pon ETL_ENABLE_LOAD=true en .env para insertar de verdad.)")

    print("\n" + "=" * 58)
    print(f"Filas agregadas desde SISG : {len(mapeados)}")
    print(f"Válidas                    : {len(validos)}")
    print(f"Rechazadas (transform)     : {len(rechazados)}")
    print(f"Ya existían en el DW       : {len(existentes)}")
    print(f"Insertadas en el buzón     : {insertados}")
    print(f"Fallidas en el buzón       : {len(fallidos)}")
    print(f"Reportes en: {REPORTS.resolve()}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\nERROR EN EL PROCESO ETL: {error}")
        raise
