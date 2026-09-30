# Proyecto-IIC2026-Grupo22
Repositorio destinado al proyecto del ramo de Visualización de la Información - IIC2026 del grupo 22.

**Tema:** horas de sueño vs productividad en 30.000 trabajadores.
**Mensaje:** en los 9 países, cada hora extra de sueño suma unos 7 puntos de productividad.

## Cómo verlo
- En línea: GitHub Pages → `https://<usuario>.github.io/Proyecto-IIC2026-Grupo22/`
- Local: abrir `index.html` con doble clic (no necesita servidor ni internet).
- El sonido parte con el botón "Activar sonido" (los navegadores exigen un clic para reproducir audio).

## Estructura
```
index.html                   página
style.css                    estilos
app.js                       mapa + gráfico + detalle coordinados (D3)
sonido.js                    sonificación (Web Audio API)
data/Work Productivity.csv   datos originales (Kaggle)
data/datos.js                datos agregados, global y por país (generados)
data/mundo.js                mapa del mundo como JS (generado)
data/countries-110m.json     mapa original (world-atlas 2.0.2)
scripts/preparar_datos.py    preprocesamiento: python scripts/preparar_datos.py
media/                       video del gato (mp4 + webm + póster)
vendor/                      D3 v7.9, topojson-client y tipografía (locales)
prototipos/                  prototipos previos a la V1 (mapa y gato)
docs/guia_R1.md              preparación de la revisión R1
docs/entrega1.md             borrador del documento de entrega
docs/como_subir_a_github.md  pasos para subir y publicar
```

## Versiones
Cada versión se marca con un tag de git: `v1`, `v2`, `v3`, `v4`.
