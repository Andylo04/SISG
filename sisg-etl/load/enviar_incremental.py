import os
import re

import pandas as pd
from sqlalchemy import text

from config.database import target_engine
from load import control_envios

COLUMNAS = ["sk_tiempo", "sk_establecimiento", "sk_geografia", "sk_diagnostico",
            "atenciones", "dias_estancia", "monto_cobrado"]
_ID = re.compile(r"[A-Za-z_][A-Za-z0-9_]*")


def _tabla_destino():
    tabla = os.getenv("DW_FACT_TABLE", "ingesta_g1_atencion").strip()
    if not _ID.fullmatch(tabla):
        raise ValueError("DW_FACT_TABLE no válido.")
    return tabla


def enviar_nuevos(df, simular=True):
    """Devuelve (insertados, fallidos_df, pendientes_df)."""
    vacio = pd.DataFrame()
    if df.empty:
        print("No hay registros válidos.")
        return 0, vacio, vacio

    enviados = control_envios.ids_enviados()
    if not simular and not enviados:
        raise RuntimeError(
            "El control de envíos está vacío: el ETL reenviaría TODO tu historial al DW.\n"
            "Primero ejecuta:  python inicializar_envios.py   (marca lo que ya se envió antes).")

    mask = [(t, int(i)) in enviados for t, i in zip(df["tipo"], df["origen_id"])]
    pendientes = df.loc[[not m for m in mask]].copy()
    print(f"Ya enviados antes: {sum(mask)} | Nuevos por enviar: {len(pendientes)}")

    if simular:
        if not enviados:
            print("AVISO: no hay control de envíos; en simulación todo aparece como nuevo. "
                  "Ejecuta inicializar_envios.py antes de cargar de verdad.")
        print("SIMULACIÓN: no se envía nada. Filas que se enviarían:")
        if not pendientes.empty:
            print(pendientes.head(20).to_string(index=False))
        return 0, vacio, pendientes

    if pendientes.empty:
        return 0, vacio, pendientes

    tabla = _tabla_destino()
    sql = text(f"INSERT INTO `{tabla}` ({', '.join(f'`{c}`' for c in COLUMNAS)}) "
               f"VALUES ({', '.join(f':{c}' for c in COLUMNAS)})")
    insertados, fallidos = 0, []
    engine = target_engine()
    try:
        for fila in pendientes.to_dict(orient="records"):
            datos = {c: (float(fila[c]) if c == "monto_cobrado" else int(fila[c])) for c in COLUMNAS}
            try:
                with engine.begin() as conn:
                    conn.execute(sql, datos)
                control_envios.registrar(fila["tipo"], fila["origen_id"])
                insertados += 1
            except Exception as e:
                fallidos.append({**fila, "error": str(getattr(e, "orig", e))[:300]})
    finally:
        engine.dispose()

    print(f"Enviados: {insertados} | Fallidos: {len(fallidos)}")
    return insertados, pd.DataFrame(fallidos), pendientes