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
            "edad": int(r["Age"]),
            "pais": r["Country"].strip()
        }
        for r in csv.DictReader(f)
    ]

min_h = min(r["sueno"] for r in filas)
max_h = max(r["sueno"] for r in filas)
min_edad = min(r["edad"] for r in filas)
max_edad = max(r["edad"] for r in filas)

def crear_limites(minimo, maximo, ancho):
    limites = []
    inicio = minimo

    while inicio < maximo - 1e-9:
        fin = round(inicio + ancho, 2)
        limites.append((round(inicio, 2), fin))
        inicio = fin

    return limites

TRAMOS_SUENO = crear_limites(min_h, max_h, ANCHO_TRAMO)
EDADES = list(range(min_edad, max_edad + 1))

def pertenece(valor, desde, hasta):
    return desde <= valor < hasta or (
        hasta >= max_h - 1e-9 and valor == max_h
    )

def resumir(grupo, desde, hasta, edad):
    if not grupo:
        return {
            "desde": desde,
            "hasta": hasta,
            "edad": edad,
            "n": 0,
            "prod": None,
            "bajo60": None
        }

    return {
        "desde": desde,
        "hasta": hasta,
        "edad": edad,
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

def calcular_matriz(datos):
    matriz = []

    for desde, hasta in TRAMOS_SUENO:
        fila = []

        for edad in EDADES:
            grupo = [
                r for r in datos
                if r["edad"] == edad
                and pertenece(r["sueno"], desde, hasta)
            ]

            fila.append(
                resumir(
                    grupo,
                    desde,
                    hasta,
                    edad
                )
            )

        matriz.append(fila)

    return matriz

def calcular_tramos(datos):
    resultado = []

    for desde, hasta in TRAMOS_SUENO:
        grupo = [
            r for r in datos
            if pertenece(r["sueno"], desde, hasta)
        ]

        if grupo:
            resultado.append({
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
            })
        else:
            resultado.append({
                "desde": desde,
                "hasta": hasta,
                "n": 0,
                "prod": None,
                "bajo60": None
            })

    return resultado

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
matriz_edad = calcular_matriz(filas)

pendiente, r_global, mx, my = regresion(filas)

resumen = {
    "n": len(filas),
    "r": round(r_global, 3),
    "pendiente": round(pendiente, 2),
    "intercepto": round(my - pendiente * mx, 2),
    "minHoras": min_h,
    "maxHoras": max_h,
    "minEdad": min_edad,
    "maxEdad": max_edad,
    "prodPromedio": round(my, 2)
}

paises = {}
bins_pais = {}
matriz_edad_pais = {}
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
        "prod": round(mp, 2)
    }

    bins_pais[pais] = calcular_tramos(sub)
    matriz_edad_pais[pais] = calcular_matriz(sub)

    for x in random.sample(
        sub,
        min(N_MUESTRA_PAIS, len(sub))
    ):
        puntos.append([
            x["sueno"],
            x["prod"],
            x["edad"],
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
        "const MATRIZ_EDAD = " +
        json.dumps(matriz_edad, ensure_ascii=False) +
        ";\n"
    )

    f.write(
        "const MATRIZ_EDAD_PAIS = " +
        json.dumps(matriz_edad_pais, ensure_ascii=False) +
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
print("Edad mínima:", min_edad)
print("Edad máxima:", max_edad)
print("Escrito:", SALIDA, "y data/mundo.js")