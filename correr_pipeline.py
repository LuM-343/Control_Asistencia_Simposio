"""CLI del Dev 1: clasifica pagos conectándose directamente a Supabase.

Uso:
  python correr_pipeline.py --tarifa 50 --db
"""
from __future__ import annotations
import argparse
import json
import os
import sys
from collections import Counter
import psycopg

from Clasificador import Config, clasificar_lote
from matcher import Padron

def leer_padron_db(conn_url: str) -> list[dict]:
    with psycopg.connect(conn_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT carnet, nombre_oficial FROM padron_estudiantes;")
            return [{"carnet": str(row[0]), "nombre": row[1]} for row in cur.fetchall()]

def leer_pagos_db(conn_url: str) -> list[dict]:
    with psycopg.connect(conn_url) as conn:
        with conn.cursor() as cur:
            # Se ajusta la consulta para capturar 'pendiente' o valores vacíos
            cur.execute("SELECT boleta, nombre_digitado, monto FROM tesoreria_pagos WHERE zona = 'pendiente' OR zona IS NULL;")
            return [{"boleta": row[0], "nombre": row[1], "monto": row[2]} for row in cur.fetchall()]

def actualizar_db(filas: list[dict], conn_url: str) -> None:
    # Se agrega "estado = %s" a la consulta SQL
    sql = """
        UPDATE tesoreria_pagos 
        SET carnet_asignado = %s, zona = %s, datos_extra = %s::jsonb, estado = %s 
        WHERE boleta = %s;
    """
    with psycopg.connect(conn_url) as conn:
        with conn.cursor() as cur:
            # Se agrega 'PROCESADO' antes de f["boleta"] para que coincida con el nuevo %s
            datos = [(f["carnet_asignado"], f["zona"], f["datos_extra"], 'PROCESADO', f["boleta"]) for f in filas]
            cur.executemany(sql, datos)
        conn.commit()
def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--tarifa", type=float, required=True)
    ap.add_argument("--db", action="store_true", help="Actualizar Supabase")
    a = ap.parse_args(argv)

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("Error: Define la variable de entorno DATABASE_URL")
        sys.exit(1)

    print("Descargando registros de Supabase...")
    padron = Padron(leer_padron_db(db_url))
    pagos = leer_pagos_db(db_url)
    cfg = Config(tarifa=a.tarifa)
    
    print(f"Clasificando {len(pagos)} pagos pendientes...")
    resultados = clasificar_lote(pagos, padron, cfg)

    if a.db and resultados:
        filas_update = [{
            "boleta": r.boleta,
            "carnet_asignado": r.carnet_asignado,
            "zona": r.zona,
            "datos_extra": json.dumps(r.datos_extra(), ensure_ascii=False)
        } for r in resultados]
        actualizar_db(filas_update, db_url)
        print("Base de datos actualizada con éxito.")

    print(dict(Counter(r.zona for r in resultados)), file=sys.stderr)

if __name__ == "__main__":
    main()