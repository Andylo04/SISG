
from pathlib import Path

from extract.extraer_sisg import extraer_hospitales_local

def main():
    print("=" * 50)
    print("PRUEBA ETL - EXTRACCIÓN DE HOSPITALES")
    print("=" * 50)

    hospitales = extraer_hospitales_local()

    if hospitales.empty:
        print("No se encontraron hospitales.")
        return

    Path("reports").mkdir(exist_ok=True)

    hospitales.to_csv(
        "reports/hospitales_extraidos.csv",
        index=False,
        encoding="utf-8-sig"
    )

    print("\nHospitales encontrados:")
    print(hospitales[[
        "hospital_id",
        "codigo_establecimiento",
        "nombre"
    ]].to_string(index=False))

    print("\nTotal:", len(hospitales))
    print("CSV generado: reports/hospitales_extraidos.csv")


if __name__ == "__main__":
    main()
