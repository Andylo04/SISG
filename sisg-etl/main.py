import os
from pathlib import Path

from dotenv import load_dotenv

from extract.extraer_catalogos import extraer_catalogos
from extract.extraer_sisg import (extraer_hechos_locales, extraer_hospitales_local,
                                  extraer_registros_locales)
from load.datamart import cargar_datamart
from load.enviar_incremental import enviar_nuevos
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
    estado = os.getenv("ETL_ESTADO_CONSULTA", "ATENDIDA").strip() or None
    solo_egresadas = os.getenv("ETL_SOLO_EGRESADAS", "true").strip().lower() == "true"
    activar = os.getenv("ETL_ENABLE_LOAD", "false").strip().lower() == "true"

    print("=" * 58)
    print("SISG ETL - GRUPO 1 | SISG local -> Data Mart -> DW")
    print("=" * 58)

    print("\n[1/5] EXTRACT: SISG local + catálogos del DW...")
    hospitales = extraer_hospitales_local()
    catalogos = extraer_catalogos()

    print("\n[2/5] DATA MART: totales mensuales (todo el historial)...")
    hechos = extraer_hechos_locales(estado)
    guardar(hechos, "1_hechos_origen.csv")
    if not hechos.empty:
        mapeados, revision = aplicar_mapeos(hechos, hospitales, catalogos)
        guardar(revision, "2_revision_establecimientos.csv")
        validos, rechazados = transformar_dataframe(mapeados, catalogos)
        guardar(rechazados, "3_rechazados.csv")
        enriquecidos = enriquecer_atenciones(validos, catalogos)
        guardar(enriquecidos, "3_atenciones_enriquecidas.csv")
        cargar_datamart(enriquecidos, catalogos,
                        {"extraidos": len(mapeados), "validos": len(validos), "rechazados": len(rechazados)})
        sin = revision[revision["sk_establecimiento"] == -1]
        if not sin.empty:
            print(f"AVISO: {len(sin)} hospital(es) sin equivalente en el DW (van como -1).")

    print("\n[3/5] EXTRACT incremental: un registro por hospitalización/consulta...")
    registros = extraer_registros_locales(estado, solo_egresadas)
    print(f"Registros elegibles: {len(registros)}")

    print("\n[4/5] TRANSFORM: llaves sk_* y validación por registro...")
    if registros.empty:
        print("Nada que enviar.")
        return
    por_registro, _ = aplicar_mapeos(registros, hospitales, catalogos, agrupar=False)
    validos_r, rechazados_r = transformar_dataframe(por_registro, catalogos)
    guardar(rechazados_r, "4_rechazados_envio.csv")
    print(f"Válidos: {len(validos_r)} | Rechazados: {len(rechazados_r)}")
    if not rechazados_r.empty:
        print(rechazados_r["motivo_rechazo"].value_counts().to_string())

    print("\n[5/5] LOAD: buzón del DW (solo lo nuevo)...")
    insertados, fallidos, pendientes = enviar_nuevos(validos_r, simular=not activar)
    guardar(fallidos, "5_fallidos_envio.csv")
    if not activar:
        print("(Modo simulación. Pon ETL_ENABLE_LOAD=true en .env para enviar de verdad.)")

    print("\n" + "=" * 58)
    print(f"Registros elegibles        : {len(registros)}")
    print(f"Válidos                    : {len(validos_r)}")
    print(f"Rechazados                 : {len(rechazados_r)}")
    print(f"Nuevos por enviar          : {len(pendientes)}")
    print(f"Enviados al buzón          : {insertados}")
    print(f"Fallidos                   : {len(fallidos)}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\nERROR EN EL PROCESO ETL: {error}")
        raise