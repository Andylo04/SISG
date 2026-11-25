def enriquecer_atenciones(hechos, catalogos):
    """Une los hechos con los catálogos (solo para reportes/Data Mart)."""
    resultado = hechos.copy()
    for clave, nombre in [("sk_establecimiento", "establecimiento"), ("sk_geografia", "geografia"),
                          ("sk_diagnostico", "diagnostico"), ("sk_tiempo", "tiempo")]:
        cat = catalogos.get(nombre)
        if cat is None or cat.empty or clave not in resultado.columns or clave not in cat.columns:
            continue
        cat = cat.drop_duplicates(subset=[clave])
        nuevas = [c for c in cat.columns if c != clave and c not in resultado.columns]
        if nuevas:
            resultado = resultado.merge(cat[[clave] + nuevas], on=clave, how="left")
    return resultado
