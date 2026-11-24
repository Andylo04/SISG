def enriquecer_atenciones(hechos, catalogos):
    """
    Une la vista de hechos con catálogos usando SK.
    Si no encuentra columnas compatibles, conserva los datos sin inventar campos.
    """
    resultado = hechos.copy()
    relaciones = [
        ("sk_establecimiento", "establecimiento"),
        ("sk_geografia", "geografia"),
        ("sk_diagnostico", "diagnostico"),
        ("sk_actor", "actor"),
    ]

    for clave, nombre in relaciones:
        catalogo = catalogos.get(nombre)
        if catalogo is None or catalogo.empty:
            continue
        if clave not in resultado.columns or clave not in catalogo.columns:
            print(f"Aviso: no se encontró la clave {clave} en {nombre}; se omite el cruce.")
            continue

        catalogo_limpio = catalogo.drop_duplicates(subset=[clave])
        columnas_nuevas = [c for c in catalogo_limpio.columns if c != clave and c not in resultado.columns]
        if not columnas_nuevas:
            continue
        resultado = resultado.merge(
            catalogo_limpio[[clave] + columnas_nuevas],
            on=clave,
            how="left",
            validate="many_to_one",
        )
    return resultado
