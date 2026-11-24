
import os
from pathlib import Path

from dotenv import load_dotenv

from extract.extraer_dw import extraer_atenciones_dw
from extract.extraer_catalogos import extraer_catalogos
from transform.transformar_datos import transformar_dataframe
from transform.enriquecer_datos import enriquecer_atenciones
from load.insertar_atenciones import insertar_atenciones

load_dotenv()

REPORTS = Path("reports")
REPORTS.mkdir(exist_ok=True)


def main():
    total_insertados = 0

    print("=" * 58)
    print("SISG ETL - GRUPO 1 | EXTRACT - TRANSFORM - LOAD")
    print("=" * 58)

    # 1. EXTRACT
    print("\n[1/4] EXTRACT: leyendo vista de atenciones del DW...")

    hechos = extraer_atenciones_dw()

    print(f"Registros extraídos: {len(hechos)}")

    if hechos.empty:
        print("La vista no devolvió registros.")
        return

    hechos.to_csv(
        REPORTS / "atenciones_originales.csv",
        index=False,
        encoding="utf-8-sig"
    )

    # 2. EXTRACT CATALOGOS
    print("\n[2/4] EXTRACT: leyendo catálogos...")

    catalogos = extraer_catalogos()

    # 3. TRANSFORM
    print("\n[3/4] TRANSFORM: limpiando y enriqueciendo...")

    validos, rechazados = transformar_dataframe(hechos)

    enriquecidos = enriquecer_atenciones(validos, catalogos)

    enriquecidos.to_csv(
        REPORTS / "atenciones_enriquecidas.csv",
        index=False,
        encoding="utf-8-sig"
    )

    if not rechazados.empty:
        rechazados.to_csv(
            REPORTS / "rechazados.csv",
            index=False,
            encoding="utf-8-sig"
        )

    print(f"Registros válidos: {len(validos)}")
    print(f"Registros rechazados: {len(rechazados)}")
    print(f"Registros enriquecidos: {len(enriquecidos)}")

    # 4. LOAD
    print("\n[4/4] LOAD: etapa de carga")

    activar_carga = os.getenv(
        "ETL_ENABLE_LOAD", "false"
    ).strip().lower() == "true"

    if activar_carga:
        print("Carga habilitada. Preparando INSERT...")

        total_insertados = insertar_atenciones(enriquecidos)

        print("Carga finalizada.")
    else:
        print("Carga deshabilitada.")
        print("Los datos fueron preparados y guardados en CSV.")
        print("Para habilitar INSERT, configura ETL_ENABLE_LOAD=true.")

    # RESUMEN
    print("\n" + "=" * 58)
    print("RESUMEN DEL ETL")
    print("=" * 58)

    print(f"Total extraído:       {len(hechos)}")
    print(f"Total válido:         {len(validos)}")
    print(f"Total rechazado:      {len(rechazados)}")
    print(f"Total enriquecido:    {len(enriquecidos)}")
    print(f"Total insertado en BD: {total_insertados}")

    print(f"\nReportes: {REPORTS.resolve()}")
    print("\nProceso ETL finalizado.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"\nERROR EN EL PROCESO ETL: {error}")
        raise
