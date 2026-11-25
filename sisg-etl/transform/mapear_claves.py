"""Traduce los códigos de SISG local a las llaves sustitutas (sk_*) del DW."""
import difflib
import re
import unicodedata
from pathlib import Path

import pandas as pd

MAPEO_MANUAL = Path(__file__).resolve().parents[1] / "config" / "mapeo_establecimiento.csv"
NO_ESPECIFICADO = -1


def _norm(texto):
    t = unicodedata.normalize("NFKD", str(texto or "")).encode("ascii", "ignore").decode().lower()
    t = re.sub(r"[^a-z0-9 ]", " ", t)
    palabras = [w for w in t.split() if w not in {"hospital", "privado", "de", "del", "la", "el", "y"}]
    return " ".join(palabras)


def mapa_geografia(cat_geo):
    """codigo INE de municipio (4 dígitos) -> sk_geografia"""
    if cat_geo.empty or "codigo_municipio" not in cat_geo.columns:
        return {}
    cod = cat_geo["codigo_municipio"].astype(str).str.strip().str.zfill(4)
    return dict(zip(cod, cat_geo["sk_geografia"].astype(int)))


def mapa_diagnostico(cat_dx):
    """cie10 -> sk_diagnostico (exacto; si no, único hijo tipo A09 -> A09.9)"""
    if cat_dx.empty or "codigo_cie10" not in cat_dx.columns:
        return lambda c: NO_ESPECIFICADO
    exacto = dict(zip(cat_dx["codigo_cie10"].astype(str).str.strip(), cat_dx["sk_diagnostico"].astype(int)))

    def resolver(codigo):
        if codigo is None or (isinstance(codigo, float) and pd.isna(codigo)):
            return NO_ESPECIFICADO
        codigo = str(codigo).strip()
        if codigo in exacto:
            return exacto[codigo]
        hijos = [sk for c, sk in exacto.items() if c.startswith(codigo + ".")]
        return hijos[0] if len(hijos) == 1 else NO_ESPECIFICADO

    return resolver


def mapa_establecimiento(hospitales, cat_est, umbral=0.80):
    """
    hospital_id -> sk_establecimiento.
    1) config/mapeo_establecimiento.csv (manual, tiene prioridad)
    2) nombre normalizado igual  3) nombre muy parecido  4) -1
    Devuelve (dict, DataFrame de revisión).
    """
    manual = {}
    if MAPEO_MANUAL.exists():
        m = pd.read_csv(MAPEO_MANUAL)
        manual = dict(zip(m["hospital_id"].astype(int), m["sk_establecimiento"].astype(int)))

    col_nombre = "establecimiento"
    candidatos = {}
    if not cat_est.empty and col_nombre in cat_est.columns:
        for sk, nombre in zip(cat_est["sk_establecimiento"].astype(int), cat_est[col_nombre]):
            if sk != NO_ESPECIFICADO:
                candidatos[sk] = (_norm(nombre), nombre)

    resultado, filas = {}, []
    for _, h in hospitales.iterrows():
        hid = int(h["hospital_id"])
        nom = _norm(h["nombre"])
        sk, metodo, detalle = NO_ESPECIFICADO, "sin coincidencia", ""
        if hid in manual:
            sk, metodo = manual[hid], "manual"
        else:
            iguales = [k for k, (n, _) in candidatos.items() if n == nom]
            if len(iguales) == 1:
                sk, metodo = iguales[0], "nombre"
            elif candidatos:
                mejor = max(candidatos.items(), key=lambda kv: difflib.SequenceMatcher(None, nom, kv[1][0]).ratio())
                r = difflib.SequenceMatcher(None, nom, mejor[1][0]).ratio()
                detalle = f"más parecido: {mejor[1][1]} ({r:.2f})"
                if r >= umbral:
                    sk, metodo = mejor[0], "parecido"
        resultado[hid] = sk
        filas.append({"hospital_id": hid, "nombre_local": h["nombre"], "sk_establecimiento": sk,
                      "metodo": metodo, "detalle": detalle})
    return resultado, pd.DataFrame(filas)


def aplicar_mapeos(hechos, hospitales, catalogos):
    """Devuelve hechos con sk_* y la tabla de revisión de establecimientos."""
    est_map, revision = mapa_establecimiento(hospitales, catalogos.get("establecimiento", pd.DataFrame()))
    geo_map = mapa_geografia(catalogos.get("geografia", pd.DataFrame()))
    dx = mapa_diagnostico(catalogos.get("diagnostico", pd.DataFrame()))

    ine = hospitales.assign(ine=hospitales["codigo_ine"].astype(str).str.strip().str.zfill(4))
    ine_por_hosp = dict(zip(ine["hospital_id"].astype(int), ine["ine"]))

    d = hechos.copy()
    d["sk_establecimiento"] = d["hospital_id"].astype(int).map(est_map).fillna(NO_ESPECIFICADO).astype(int)
    d["sk_geografia"] = d["hospital_id"].astype(int).map(
        lambda h: geo_map.get(ine_por_hosp.get(h), NO_ESPECIFICADO)).astype(int)
    d["sk_diagnostico"] = d["cie10"].map(dx).astype(int)
    d["sk_tiempo"] = d["sk_tiempo"].astype(int)

    claves = ["sk_tiempo", "sk_establecimiento", "sk_geografia", "sk_diagnostico"]
    d = (d.groupby(claves, as_index=False)
           .agg(atenciones=("atenciones", "sum"), dias_estancia=("dias_estancia", "sum"),
                monto_cobrado=("monto_cobrado", "sum")))
    d["atenciones"] = d["atenciones"].astype(int)
    d["dias_estancia"] = d["dias_estancia"].astype(int)
    d["monto_cobrado"] = d["monto_cobrado"].astype(float).round(2)
    return d, revision
