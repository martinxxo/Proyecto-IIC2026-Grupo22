# Guía para la R1 — Sueño vs Productividad (Grupo 22)

> Documento interno. **Todos** deben leerlo: el profesor conversa con cada integrante por separado y el modificador de nota es individual.

---

## 1. Qué había antes de la V1 (los dos prototipos)

Guardados en `prototipos/` (rutas arregladas para que abran). Verifiquen el orden real en el historial de commits.

### Prototipo A — mapa mundial (`prototipos/mapa/`)
- **Qué hacía:** promedio de sueño y de productividad por país (9 países), pintados en un mapa D3. Al *mantener apretado* el clic aparecía un tooltip con los dos promedios.
- **Sonido:** ninguno (botón "Próximamente" con un `alert`).
- **Problemas:**
  - **Evidencia de los datos:** los 9 países son casi idénticos (sueño 6,48–6,54 h; productividad 74,6–75,2). Promediar por país borraba justo la relación que queríamos mostrar (sueño ↔ productividad).
  - **Color como ruido (cáps. 11):** cada país con un color categórico distinto que no codificaba nada.
  - **Interacción poco descubrible:** "mantener el clic" no es un gesto que la gente pruebe sola; Japón, Corea y Reino Unido son casi imposibles de clickear a esa escala.

### Prototipo B — el gato y el slider (`prototipos/gato/`)
- **Qué hacía:** slider de horas de sueño; para esas horas, la productividad promedio se mostraba con 10 casillas de "tareas" y la velocidad de un video de un gato tecleando.
- **Sonido:** ninguno (video en `muted`).
- **Lo que se conservó:** la pregunta correcta, el slider, el gato y las casillas.
- **Problemas:**
  - **Lie Factor (cáps. 07):** la productividad va de 56 a 91 (+62 %) pero las casillas iban de 3 a 10 (+233 %) y el video de 0,5× a 2× (+300 %). Lie factor ≈ **3,8** (casillas) y ≈ **4,8** (video).
  - **Sin vista general:** solo un tramo a la vez (falla *overview first*).
  - **Solo promedios:** no mostraba la dispersión (Anscombe, cáps. 02).

---

## 2. Qué es la V1: una sola visualización con tres vistas coordinadas

**Mensaje (es el título):** *En los 9 países, cada hora extra de sueño suma unos 7 puntos de productividad.*

La idea clave para defender el mapa: **no lo usamos para mostrar diferencias entre países (no las hay), sino como la puerta de entrada para comprobar que la relación sueño–productividad se repite igual en todos lados.** Las pendientes por país van de +7,3 (Corea del Sur) a +7,6 (Canadá). Que "el mapa no muestre diferencias" es, en sí, un hallazgo.

```
┌───────────── 1. MAPA ─────────────┐ ┌──────── 2. GRÁFICO ────────┐
│ clic en un país = filtrar          │ │ nube + línea + banda        │
│ chips con la pendiente de cada país│ │ líneas grises = 9 países    │
└────────────────────────────────────┘ │ hover/slider = elegir horas │
                                       └─────────────────────────────┘
┌────────────────── 3. DETALLE + SONIDO ─────────────────────────────┐
│ "En Japón, quienes duermen entre 6 y 6,5 h": gato · 73/100 ·        │
│ 19 de cada 100 bajo 60 · botones de sonido                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Cómo encaja con el mantra de Shneiderman (cáps. 25)
- **Overview:** sin tocar nada, el título + la línea que sube + las 9 líneas grises superpuestas cuentan el mensaje.
- **Zoom & filter:** el **mapa** (o los chips) filtra por país: la línea gruesa, la banda y la nube pasan a ser solo de ese país, y las otras 8 quedan en gris como referencia. Los botones "Bajo 60 / 60 o más" filtran la nube.
- **Details on demand:** pasar el mouse por el gráfico (o el slider, o ← →) elige un tramo de 30 min; el panel de abajo muestra ese tramo en ese país. El tooltip del mapa da n y pendiente de cada país.

### Datos y procesamiento (`scripts/preparar_datos.py` → `data/datos.js` y `data/mundo.js`)
- *Work Productivity* (Kaggle), 30.000 trabajadores, ~3.300 por país. **Sintético** (sección 4).
- Variables: `Sleep_Hours` (4,0–9,0 h), `Productivity_Score` (30–100), `Burnout_Risk`, `Country`.
- **10 tramos de 30 min**, calculados para el total (~3.000 por tramo) y dentro de cada país (~330 por tramo). Por tramo: n, promedio, percentiles 25 y 75, % bajo 60.
- Pendiente (regresión lineal) y correlación r, global y por país. Global: r = 0,63, +7,44 puntos/hora.
- Nube: muestra aleatoria de **300 trabajadores por país** (2.700 puntos, semilla fija 22) para evitar sobre-trazado. Los promedios y la banda usan todos los datos.
- El mapa (world-atlas, Natural Earth 1:110m) y las librerías van **locales**: la página funciona sin internet y con doble clic.

| Tramo | n total | Promedio | P25–P75 | Bajo 60 |
|---|---|---|---|---|
| 4,0–4,5 h | 2.645 | 57,1 | 47–67 | 56 % |
| 5,0–5,5 h | 2.955 | 65,1 | 55–75 | 35 % |
| 6,0–6,5 h | 3.004 | 72,9 | 63–83 | 19 % |
| 7,0–7,5 h | 3.076 | 81,1 | 72–92 | 7 % |
| 8,5–9,0 h | 3.261 | 90,4 | 84–100 | 0,7 % |

### Forma visual
- **Mapa:** los 9 países en un solo tono (color = "hay datos", nada más; cáps. 11), el elegido en ámbar. Un punto blanco en cada país amplía la zona clicable (Japón, Corea y Reino Unido son diminutos). Clic en el océano = volver a los 9 países.
- **Gráfico:** scatter + línea de promedios + banda P25–P75 + 9 líneas grises (una por país).
  - Dos variables continuas cuya **relación** es la pregunta → posición en eje común, lo mejor leído según Cleveland & McGill (cáps. 16).
  - **Eje Y 0–100 sin truncar** (cáps. 07 y 08).
  - Las 9 líneas superpuestas en el **mismo eje** comparan países mejor que 9 mini-gráficos separados o colores en el mapa.
  - Anotación directa con la pendiente, que cambia según el país elegido.
- **Detalle:** gato con velocidad **proporcional** (`productividad / 75`, de 0,76× a 1,21×), número + **10 casillas × 10 puntos** con llenado parcial, y **100 puntos** "X de cada 100 rinden bajo 60" (frecuencias naturales, cáps. 05).

### Sonificación (`sonido.js`, Web Audio API; cáps. 27 y técnica T4)
**Idea central: lo que se escucha es el teclado del gato.** El sonido es continuo mientras está activado y cambia apenas cambia el tramo o el país. Ninguno de los parámetros es el volumen:

| Qué se escucha | Dato | Cómo se conecta con lo visual |
|---|---|---|
| **Velocidad del tecleo** | productividad promedio del tramo | teclas por segundo = productividad / 10 (≈5,7/s a 4 h; ≈9/s a 9 h). Es **el mismo factor** que acelera el video del gato (productividad / 75): se ve y se oye la misma velocidad. La etiqueta del video dice ambas cosas ("0,8× · 5,7 teclas/s"). |
| **Sonido de error** ("bonk" del computador) | % de trabajadores bajo 60 puntos | cada error hace **parpadear en rojo** el marco del gato, el mismo rojo de los puntos "bajo 60". A 4 h hay un error cada ~1,5 s; a 6 h, cada ~4 s; a 9 h, casi nunca. |
| **Izquierda / derecha** | ubicación del país en el mapa | paneo estéreo según la longitud: EE. UU./Canadá a la izquierda, Europa al centro, Asia/Australia a la derecha. |

**Por qué este diseño (rationale):**
- Son **íconos auditivos** (cáps. 27): sonidos del mundo real cuyo significado no hay que aprender. Un teclado rápido "suena a trabajo", un error "suena a equivocarse". Una nota musical que sube, en cambio, habría que explicarla.
- El sonido y la imagen cuentan **lo mismo al mismo tiempo** (gato ↔ teclado; puntos rojos ↔ errores ↔ parpadeo): refuerzo entre canales, no un adorno aparte.
- El ritmo como magnitud sigue la lógica del contador Geiger y del sensor de estacionamiento (cáps. 04): más rápido = más.
- Los errores no son al azar: cada tecla suma "%bajo 60 × 0,25" y al llegar a 1 hay un error. Así la frecuencia es **exactamente proporcional** al dato y dos personas escuchan lo mismo.
- Técnica: *lookahead scheduling*: cada 25 ms se programan las teclas de los próximos 120 ms con el reloj del `AudioContext`, para que el ritmo sea estable.

**Cómo se usa:**
1. **Clic en un país** → se activa el sonido (el clic es el gesto que el navegador exige) y arranca el **recorrido de 4 a 9 h** (~9 s): el tecleo se acelera junto con el gato, los errores se van espaciando hasta desaparecer, y todo suena desde el lado del mapa donde está el país.
2. Clic en otro país → mismo recorrido, casi igual, pero desde otro lado: el oído confirma "en todos lados pasa lo mismo".
3. **Pasar el mouse por el gráfico** → el tecleo cambia de velocidad al instante (y corta el recorrido automático).
4. **"Escuchar de 4 a 9 horas"** repite el recorrido; **"Sonido activado"** lo silencia.

*Versión anterior del sonido (descartada el mismo día, sirve para el documento):* una nota musical que subía con la productividad, un tecleo sintético y una capa "áspera" para el % bajo 60. Se descartó porque tres capas abstractas necesitaban leyenda para entenderse y no tenían relación con lo que se ve; el teclado del gato sí la tiene.

### Implementación (para responder "¿cómo funciona?")
- `index.html` estructura, `style.css` estilos, `app.js` lógica, `sonido.js` audio.
- `app.js` tiene un **estado** (`pais`, `tramo`, `filtro`). Tres funciones lo cambian: `seleccionarPais()`, `seleccionarTramo()` y los filtros. Cada una actualiza las tres vistas y el sonido: así se mantienen coordinadas.
- Mapa: `topojson.feature` convierte el TopoJSON a GeoJSON; `d3.geoNaturalEarth1` proyecta; `d3.geoCentroid` da la longitud para el paneo.
- Gráfico: `d3.scaleLinear` para los ejes, `d3.line` (promedio), `d3.area` (banda).
- Sonido: un `AudioContext`. Cada tecla = ruido blanco por un filtro pasa-banda (el "clac" de plástico) + un oscilador grave muy corto (el tope de la tecla); cada ~5 teclas una barra espaciadora más grave. El error = dos notas triangulares descendentes. Todo pasa por un `StereoPannerNode` (izquierda/derecha).

---

## 3. Preguntas probables del profesor

1. **¿Cuál es el mensaje?** — El título.
2. **¿Por qué un mapa si los países son iguales?** — Porque el mapa no está para comparar colores, sino para **filtrar** y comprobar que la relación se repite en cada país. Primero lo usamos para mostrar promedios por país (prototipo A) y vimos que no había diferencias: eso nos hizo cambiar su rol. Si él piensa que el mapa sobra, es una discusión legítima (sección 5).
3. **¿Por qué los países no tienen colores distintos?** — Porque el color tiene que codificar un dato; como la pendiente casi no varía (7,3–7,6), cualquier escala de color mostraría lo mismo o, peor, exageraría diferencias mínimas.
4. **¿Por qué no barras?** — Dos variables continuas; las barras solo mostrarían promedios y esconderían la dispersión.
5. **¿Por qué el eje Y parte en 0?** — Para no inflar la pendiente (lie factor).
6. **¿Por qué tramos de 30 min?** — ~3.000 personas por tramo total, ~330 por país. Con tramos de 1 hora el patrón es el mismo (59,6 → 67,1 → 75,1 → 82,6 → 88,9), así que no es un efecto del bin (cáps. 09).
7. **¿Qué es la banda?** — Percentiles 25 a 75: la mitad central de las personas del tramo.
8. **¿Qué codifica el sonido?** — Es el teclado del gato: velocidad = productividad (igual que el video), errores = % bajo 60 (con parpadeo rojo), izquierda/derecha = país. No se usa volumen.
9. **¿Qué aporta el gato?** — Es el ancla del sonido: el teclado que se escucha es el suyo, a la misma velocidad. Viene del prototipo B y ahora es proporcional al dato.
10. **¿Prueba que dormir causa productividad?** — No: correlación, y con datos sintéticos (lo dice el pie de página).

---

## 4. Lo que deben saber del dataset (y decir con honestidad)

- **Es sintético:** sueño uniforme entre 4 y 9 h; países casi idénticos; ~3.300 por país; rol, tamaño de empresa y modalidad no cambian la productividad.
- **`Burnout_Risk` = exactamente `Productividad < 60`.** Por eso en la V1 aparece como "rinden bajo 60 puntos (el dataset los marca en riesgo de burnout)" y no como variable independiente.
- **`Stress_Level` no se relaciona con nada** (productividad 75,0 en los tres niveles).
- **Efecto techo:** 10,5 % tiene exactamente 100 (la fila de puntos arriba del gráfico).
- La relación es casi perfectamente lineal: probablemente es la fórmula con que se generaron los datos. ¿Estamos visualizando un hallazgo o la receta del dataset?

---

## 5. Preguntas concretas para llevar (la pauta pide 2–3)

1. **El mapa:** si los países no se diferencian, ¿el mapa ayuda a creer el mensaje ("pasa en todos lados") o es un paso extra que distrae de la relación sueño–productividad?
2. **El sonido:** ¿se distingue bien la diferencia de velocidad del tecleo entre 4 y 9 h (5,7 vs 9 teclas/s), o hay que exagerarla (y eso sería un lie factor sonoro)? ¿El paneo izquierda/derecha aporta o sobra?
3. **Los datos:** sabiendo que el dataset es sintético (y que "burnout" está derivado de la productividad), ¿seguimos con él transparentándolo o buscamos datos reales?

---

## 6. Checklist del día

- [ ] V1 subida a GitHub con tag `v1` y GitHub Pages funcionando (probar el link desde otro computador).
- [ ] Copia local en el computador: si falla el WiFi, doble clic en `index.html` (funciona sin internet).
- [ ] Volumen encendido y probado. Si pueden, lleven audífonos o parlante estéreo para que se note el izquierda/derecha.
- [ ] Navegador abierto en la visualización, pantalla completa, sin otras pestañas. Recarguen la página justo antes (así parte en "los 9 países").
- [ ] Cada integrante puede explicar: mensaje, rol del mapa, forma visual, sonido y cómo está hecho.
- [ ] Alguien anota durante la revisión (fecha, qué se dijo, dudas) → va a la sección R1 del documento.
- [ ] **Después de la R1:** discutir cada comentario y decidir *adoptar o descartar con argumentos* antes de tocar código.
