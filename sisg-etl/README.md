# SISG ETL – Grupo 1 (Atención Privada)

Flujo: **SISG local (MySQL) → transformación a llaves sk_* → Data Mart local (SQLite) → buzón `ingesta_g1_atencion` del DW**.

```
pip install -r requirements.txt
copy .env.example .env      # y completar contraseñas
python diagnostico.py       # verifica conexiones, permisos y columnas
python main.py              # ETL en modo simulación (ETL_ENABLE_LOAD=false)
# cuando el reporte se vea bien: ETL_ENABLE_LOAD=true en .env y volver a correr
```

Reportes en `reports/`: `1_hechos_origen`, `2_revision_establecimientos`, `3_rechazados`,
`3_atenciones_enriquecidas`, `4_fallidos_carga`.

Si un hospital queda con `sk_establecimiento = -1`, agrega su equivalencia en
`config/mapeo_establecimiento.csv` (`hospital_id,sk_establecimiento`).
