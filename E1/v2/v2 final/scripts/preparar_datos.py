import csv
import json
import random
import statistics as st
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ENTRADA = RAIZ / "data" / "Work Productivity.csv"
SALIDA = RAIZ / "data" / "datos.js"
ANCHO_TRAMO = 0.5
N_MUESTRA_PAIS = 300
random.seed(22)

with open(ENTRADA, newline="", encoding="utf-8") as f:
    filas = [
        {
            "sueno": float(r["Sleep_Hours"]),
            "prod": float(r["Productivity_Score"]),
            "burnout": r["Burnout_Risk"].strip() == "Yes",
            "pais": r["Country"].strip()
        }
        for r in csv.DictReader(f)
    ]

min_h = min(r["sueno"] for r in filas)
max_h = max(r["sueno"] for r in filas)

def crear_limites(minimo, maximo, ancho):
    limites = []
    inicio = minimo

    while inicio < maximo - 1e-9:
        fin = round(inicio + ancho, 2)
        limites.append((round(inicio, 2), fin))
        inicio = fin

    return limites

TRAMOS_SUENO = crear_limites(min_h, max_h, ANCHO_TRAMO)

def pertenece(valor, desde, hasta):
    return desde <= valor < hasta or (
        hasta >= max_h - 1e-9 and valor == max_h
    )

def resumir(grupo, desde, hasta):
    if not grupo:
        return {
            "desde": desde,
            "hasta": hasta,
            "n": 0,
            "prod": None,
            "bajo60": None
        }

    return {
        "desde": desde,
        "hasta": hasta,
        "n": len(grupo),
        "prod": round(
            st.mean(r["prod"] for r in grupo),
            2
        ),
        "bajo60": round(
            sum(r["prod"] < 60 for r in grupo) / len(grupo),
            4
        )
    }

def calcular_tramos(datos):
    resultado = []

    for desde, hasta in TRAMOS_SUENO:
        grupo = [
            r for r in datos
            if pertenece(r["sueno"], desde, hasta)
        ]

        resultado.append(
            resumir(grupo, desde, hasta)
        )

    return resultado

def calcular_burnout(datos):
    return {
        "no": calcular_tramos(
            [r for r in datos if not r["burnout"]]
        ),
        "si": calcular_tramos(
            [r for r in datos if r["burnout"]]
        )
    }

def regresion(datos):
    xs = [r["sueno"] for r in datos]
    ys = [r["prod"] for r in datos]

    mx = st.mean(xs)
    my = st.mean(ys)

    sxy = sum(
        (x - mx) * (y - my)
        for x, y in zip(xs, ys)
    )

    sxx = sum(
        (x - mx) ** 2
        for x in xs
    )

    syy = sum(
        (y - my) ** 2
        for y in ys
    )

    pendiente = sxy / sxx
    correlacion = sxy / (sxx * syy) ** 0.5

    return pendiente, correlacion, mx, my

bins = calcular_tramos(filas)
burnout = calcular_burnout(filas)

pendiente, r_global, mx, my = regresion(filas)

resumen = {
    "n": len(filas),
    "r": round(r_global, 3),
    "pendiente": round(pendiente, 2),
    "intercepto": round(my - pendiente * mx, 2),
    "minHoras": min_h,
    "maxHoras": max_h,
    "burnoutGlobal": round(
        sum(r["burnout"] for r in filas) / len(filas),
        4
    ),
    "prodPromedio": round(my, 2)
}

paises = {}
bins_pais = {}
burnout_pais = {}
puntos = []

for pais in sorted({r["pais"] for r in filas}):
    sub = [
        r for r in filas
        if r["pais"] == pais
    ]

    p, rr, _, mp = regresion(sub)

    paises[pais] = {
        "n": len(sub),
        "pendiente": round(p, 2),
        "r": round(rr, 3),
        "prod": round(mp, 2),
        "burnout": round(
            sum(x["burnout"] for x in sub) / len(sub),
            4
        )
    }

    bins_pais[pais] = calcular_tramos(sub)
    burnout_pais[pais] = calcular_burnout(sub)

    for x in random.sample(
        sub,
        min(N_MUESTRA_PAIS, len(sub))
    ):
        puntos.append([
            x["sueno"],
            x["prod"],
            1 if x["burnout"] else 0,
            pais
        ])

with open(SALIDA, "w", encoding="utf-8") as f:
    f.write(
        "const RESUMEN = " +
        json.dumps(resumen, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const BINS = " +
        json.dumps(bins, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const PAISES = " +
        json.dumps(paises, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const BINS_PAIS = " +
        json.dumps(bins_pais, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const BURNOUT = " +
        json.dumps(burnout, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const BURNOUT_PAIS = " +
        json.dumps(burnout_pais, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const PUNTOS = " +
        json.dumps(
            puntos,
            separators=(",", ":"),
            ensure_ascii=False
        ) +
        ";\n"
    )

with open(
    RAIZ / "data" / "countries-110m.json",
    encoding="utf-8"
) as f:
    mundo = f.read()

with open(
    RAIZ / "data" / "mundo.js",
    "w",
    encoding="utf-8"
) as f:
    f.write(
        "const MUNDO = " +
        mundo.strip() +
        ";\n"
    )

print("Resumen:", resumen)
print("Sin burnout:", sum(not r["burnout"] for r in filas))
print("Con burnout:", sum(r["burnout"] for r in filas))
print("Escrito:", SALIDA, "y data/mundo.js")