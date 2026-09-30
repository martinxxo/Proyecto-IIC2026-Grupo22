"""
Preprocesamiento de datos — Proyecto IIC2026 Grupo 22 (Sueño vs Productividad)

Lee data/Work Productivity.csv (30.000 trabajadores) y genera data/datos.js,
un archivo JavaScript con tres constantes:
  - RESUMEN: n, correlación de Pearson y recta de regresión
  - BINS:    agregados por tramos de 30 minutos de sueño
             (n, promedio, cuartiles P25-P75, % en riesgo de burnout)
  - PAISES:  resumen por país (n, pendiente, r, % bajo 60)
  - BINS_PAIS: los mismos tramos, calculados dentro de cada país
  - PUNTOS:  muestra aleatoria de 300 trabajadores por país (2.700) para la nube
Además genera data/mundo.js con el mapa (world-atlas, TopoJSON) para no
depender de internet.

Se genera un .js (en vez de leer el CSV en el navegador) para que la página
cargue al instante y funcione incluso abriendo index.html con doble clic
(fetch/d3.csv fallan con file://).

Uso:  python scripts/preparar_datos.py
"""
import csv
import json
import random
import statistics as st
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "data" / "Work Productivity.csv"
SALIDA = RAIZ / "data" / "datos.js"
ANCHO_TRAMO = 0.5      # horas
N_MUESTRA_PAIS = 300
random.seed(22)        # semilla fija: la muestra siempre es la misma

with open(ENTRADA, newline="", encoding="utf-8") as f:
    filas = [
        {
            "sueno": float(r["Sleep_Hours"]),
            "prod": float(r["Productivity_Score"]),
            "burnout": r["Burnout_Risk"].strip() == "Yes",
            "pais": r["Country"].strip(),
        }
        for r in csv.DictReader(f)
    ]

min_h = min(r["sueno"] for r in filas)
max_h = max(r["sueno"] for r in filas)

# Tramos [4.0, 4.5), [4.5, 5.0), ... ; el último incluye el máximo (9.0)
def calcular_tramos(datos):
    tramos = []
    inicio = min_h
    while inicio < max_h - 1e-9:
        fin = round(inicio + ANCHO_TRAMO, 2)
        ultimo = fin >= max_h - 1e-9
        grupo = [r for r in datos
                 if inicio <= r["sueno"] < fin or (ultimo and r["sueno"] == max_h)]
        prods = sorted(r["prod"] for r in grupo)
        q = st.quantiles(prods, n=4)
        tramos.append({
            "desde": round(inicio, 2),
            "hasta": fin,
            "centro": round(inicio + ANCHO_TRAMO / 2, 2),
            "n": len(grupo),
            "prod": round(st.mean(prods), 2),
            "p25": q[0],
            "p75": q[2],
            "burnout": round(sum(r["burnout"] for r in grupo) / len(grupo), 4),
        })
        inicio = fin
    return tramos


def regresion(datos):
    xs = [r["sueno"] for r in datos]
    ys = [r["prod"] for r in datos]
    mx, my = st.mean(xs), st.mean(ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    return sxy / sxx, sxy / (sxx * syy) ** 0.5, mx, my


bins = calcular_tramos(filas)

# Correlación de Pearson y recta de regresión (sobre los 30.000 registros)
pendiente, r_global, mx, my = regresion(filas)
resumen = {
    "n": len(filas),
    "r": round(r_global, 3),
    "pendiente": round(pendiente, 2),
    "intercepto": round(my - pendiente * mx, 2),
    "minHoras": min_h,
    "maxHoras": max_h,
    "burnoutGlobal": round(sum(r["burnout"] for r in filas) / len(filas), 4),
    "prodPromedio": round(my, 2),
}

# Por país
paises = {}
bins_pais = {}
puntos = []
for pais in sorted({r["pais"] for r in filas}):
    sub = [r for r in filas if r["pais"] == pais]
    p, rr, _, mp = regresion(sub)
    paises[pais] = {
        "n": len(sub),
        "pendiente": round(p, 2),
        "r": round(rr, 3),
        "prod": round(mp, 2),
        "burnout": round(sum(x["burnout"] for x in sub) / len(sub), 4),
    }
    bins_pais[pais] = calcular_tramos(sub)
    for x in random.sample(sub, N_MUESTRA_PAIS):
        puntos.append([x["sueno"], x["prod"], 1 if x["burnout"] else 0, pais])


with open(SALIDA, "w", encoding="utf-8") as f:
    f.write("// Archivo generado por scripts/preparar_datos.py — no editar a mano\n")
    f.write("const RESUMEN = " + json.dumps(resumen, ensure_ascii=False) + ";\n")
    f.write("const BINS = " + json.dumps(bins, ensure_ascii=False) + ";\n")
    f.write("const PAISES = " + json.dumps(paises, ensure_ascii=False) + ";\n")
    f.write("const BINS_PAIS = " + json.dumps(bins_pais, ensure_ascii=False) + ";\n")
    f.write("const PUNTOS = " + json.dumps(puntos, separators=(",", ":")) + ";\n")

# Mapa del mundo como variable JS (funciona sin servidor ni internet)
with open(RAIZ / "data" / "countries-110m.json", encoding="utf-8") as f:
    mundo = f.read()
with open(RAIZ / "data" / "mundo.js", "w", encoding="utf-8") as f:
    f.write("// world-atlas 2.0.2 (Natural Earth 1:110m), generado por scripts/preparar_datos.py\n")
    f.write("const MUNDO = " + mundo.strip() + ";\n")

print("Resumen:", resumen)
for b in bins:
    print(f"{b['desde']:.1f}-{b['hasta']:.1f} h  n={b['n']:5d}  prod={b['prod']:.1f}  "
          f"P25-P75=[{b['p25']:.0f}, {b['p75']:.0f}]  burnout={b['burnout']*100:.1f}%")
for pais, d in paises.items():
    print(f"{pais:12s} n={d['n']}  pendiente={d['pendiente']}  r={d['r']}  prod={d['prod']}")
print("Escrito:", SALIDA, "y data/mundo.js")
