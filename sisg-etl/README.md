# SISG ETL - Grupo 1

Proyecto independiente en Python para consumir datos del Data Warehouse y preparar la alimentación de tablas físicas autorizadas.

## 1. Preparación
En la raíz del proyecto:
```bash
python -m pip install -r requirements.txt
```

Copia `.env.example` a `.env` y completa `TARGET_DB_PASSWORD` con la contraseña real del usuario del Grupo 1. No compartas ni subas `.env` a GitHub.

La conexión de origen `SOURCE_DB_*` es para la base operacional local; complétala cuando tengas el servidor y esquema locales disponibles.

## 2. Probar conexión al DW
```bash
python -m config.probar_conexion
```

## 3. Ejecutar consumo, transformación y enriquecimiento
```bash
python main.py
```
El proceso lee `vw_g1_fact_atencion_privada` y los catálogos configurados, transforma y genera archivos CSV en `reports/`.

## 4. Alimentación (INSERT)
Los módulos `load/` están preparados para insertar con parámetros y transacción en tablas físicas existentes. **No están habilitados automáticamente.**
Antes de usarlos, confirma con el responsable del DW:
- nombre de la tabla física destino;
- columnas y tipos exactos;
- claves foráneas/dimensiones;
- estrategia de duplicados o clave única;
- permisos de INSERT.

No insertes en vistas `vw_*`. No se crean, reemplazan ni truncan tablas. No ejecutes cargas repetidas sin una estrategia anti-duplicados.

## 5. Verificación de sintaxis
```bash
python -m compileall config extract transform load main.py
```
