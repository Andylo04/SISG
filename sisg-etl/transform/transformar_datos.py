import pandas as pd

def transformar_dataframe(df):
    """Limpieza general conservadora y separación de duplicados exactos."""
    datos = df.copy()
    if datos.empty:
        return datos, datos.copy()

    for columna in datos.select_dtypes(include=["object"]).columns:
        datos[columna] = datos[columna].map(
            lambda valor: valor.strip() if isinstance(valor, str) else valor
        )

    datos = datos.dropna(how="all")
    mascara_duplicados = datos.duplicated(keep="first")
    rechazados = datos.loc[mascara_duplicados].copy()
    if not rechazados.empty:
        rechazados["motivo_rechazo"] = "Duplicado exacto"
    validos = datos.loc[~mascara_duplicados].copy()
    return validos, rechazados
