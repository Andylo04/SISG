import pandas as pd

CLAVES = ["sk_tiempo", "sk_establecimiento", "sk_geografia", "sk_diagnostico"]
CATALOGO_POR_CLAVE = {
    "sk_tiempo": "tiempo",
    "sk_establecimiento": "establecimiento",
    "sk_geografia": "geografia",
    "sk_diagnostico": "diagnostico",
}


def transformar_dataframe(df, catalogos=None):
    """
    Separa válidos de rechazados:
      - negativos, nulos
      - llaves que no existen en vw_cat_* (el trigger del DW las rechazaría)
    Devuelve (validos, rechazados) ; rechazados trae 'motivo_rechazo'.
    """
    datos = df.copy()
    if datos.empty:
        return datos, datos.copy()

    datos["motivo_rechazo"] = ""

    def marcar(mask, motivo):
        sin_motivo = mask & (datos["motivo_rechazo"] == "")
        datos.loc[sin_motivo, "motivo_rechazo"] = motivo

    marcar(datos[CLAVES + ["atenciones", "dias_estancia", "monto_cobrado"]].isnull().any(axis=1), "Valor nulo")
    marcar((datos["atenciones"] < 0) | (datos["dias_estancia"] < 0) | (datos["monto_cobrado"] < 0),
           "Valor negativo")

    for clave, nombre in CATALOGO_POR_CLAVE.items():
        cat = (catalogos or {}).get(nombre)
        if cat is None or cat.empty or clave not in cat.columns:
            print(f"Aviso: sin catálogo '{nombre}' para validar {clave}.")
            continue
        existentes = set(cat[clave].astype(int))
        marcar(~datos[clave].isin(existentes), f"{clave} no existe en vw_cat_{nombre}")

    mask = datos["motivo_rechazo"] != ""
    return datos.loc[~mask].drop(columns="motivo_rechazo").copy(), datos.loc[mask].copy()
