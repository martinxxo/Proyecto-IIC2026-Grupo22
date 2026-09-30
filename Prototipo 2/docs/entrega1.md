# Entrega 1 — Sueño vs Productividad
### IIC2026 Visualización de Información · Grupo 22

> Borrador vivo del documento de entrega. Sigue la plantilla de la sección 10 de la pauta. Se exporta a PDF al final.
> Lo marcado con **[COMPLETAR]** depende de cosas que todavía no pasan (revisiones, evaluación con usuarios, versiones futuras) y **no se puede escribir por adelantado**: tiene que salir de lo que realmente ocurra.

---

## 1. Portada

- **Grupo:** 22
- **Integrantes:** [COMPLETAR]
- **GitHub Pages:** https://[usuario].github.io/Proyecto-IIC2026-Grupo22/ [COMPLETAR]
- **Repositorio:** https://github.com/[usuario]/Proyecto-IIC2026-Grupo22 [COMPLETAR]
- **Video:** [COMPLETAR — YouTube no listado, con audio]

---

## 2. Contexto general

### Mensaje principal
En los 9 países del estudio, quienes duermen más son en promedio más productivos: cada hora adicional de sueño se asocia a unos 7 puntos más de productividad (escala 0–100), con pendientes casi idénticas en todos los países (+7,3 a +7,6). Quienes duermen entre 4 y 4,5 horas promedian 57 puntos y más de la mitad rinde bajo 60; quienes duermen entre 8,5 y 9 horas promedian 90 y casi ninguno baja de 60. La visualización parte en un mapa para elegir dónde mirar, muestra la relación con su dispersión y la traduce a frecuencias naturales ("X de cada 100"). El sonido es el teclado de un gato que trabaja: teclea más rápido cuanto más productivo es el grupo, se equivoca más seguido cuando hay más trabajadores bajo 60 puntos, y cada país suena desde su lado del mapa. Es una asociación, no prueba de causalidad.

### Origen y procesamiento de los datos
Dataset *Work Productivity* de Kaggle [COMPLETAR link]: 30.000 registros sintéticos, 17 variables, ~3.300 por país. Usamos `Sleep_Hours`, `Productivity_Score`, `Burnout_Risk` y `Country`. Detectamos que `Burnout_Risk = Yes` equivale exactamente a `Productividad < 60`, por lo que lo presentamos como "bajo 60 puntos". Con `scripts/preparar_datos.py` agrupamos en 10 tramos de 30 minutos, para el total y por país (promedio, percentiles 25/75, % bajo 60), calculamos pendiente y r por país y tomamos una muestra reproducible de 300 personas por país para la nube. Todo se exporta a `data/datos.js` y el mapa (world-atlas 1:110m) a `data/mundo.js`, para que funcione sin servidor ni internet.

---

## 3. (Previo) Prototipos exploratorios — antes de la V1

> La pauta pide documentar el proceso honesto, con desvíos. Estos dos prototipos no son "versiones" completas (no tenían sonido), pero explican de dónde sale la V1.

- **Prototipo A — mapa por país** (commit [COMPLETAR]): promedios de sueño y productividad por país en un mapa D3 con tooltip al mantener el clic. Como codificación, **no funcionaba**: los 9 países tienen productividad entre 74,6 y 75,2, el color categórico no codificaba nada y la interacción no era descubrible. **Se conservó el mapa, pero cambió su rol**: de mostrar promedios a filtrar por país.
- **Prototipo B — gato + slider** (commit [COMPLETAR]): slider de horas que mostraba productividad con 10 casillas y la velocidad de un video. **Se conservó la idea**, pero tenía lie factor ≈ 3,8 (casillas de 3 a 10 para una variación real de +62 %) y ≈ 4,8 (video de 0,5× a 2×), y no tenía vista general ni sonido.

---

## 4. V1 — la idea completa

**Identificación:** V1 · [fecha] · tag `v1` · commit [COMPLETAR hash]

**Evidencia:** [COMPLETAR — capturas: vista inicial; Japón elegido con filtro "Bajo 60". Video 30–60 s con audio: clic en EE. UU. y luego en Japón (se escucha el recorrido y el cambio de lado), hover por el gráfico, filtro]

**Decisiones iniciales**
- Título = mensaje. Tres vistas coordinadas en una sola página: mapa → gráfico → detalle.
- Mapa como filtro por país (clic, teclado o chips con la pendiente de cada país); un solo tono para los países con datos.
- Gráfico: nube (300 por país) + promedio por tramo de 30 min + banda P25–P75 + 9 líneas grises de países; eje Y 0–100.
- Detalle bajo demanda al recorrer las horas: gato con velocidad proporcional, número + 10 casillas proporcionales, 100 puntos en frecuencias naturales.
- Sonido = el teclado del gato, continuo: velocidad del tecleo = productividad (mismo factor que el video del gato); sonido de error + parpadeo rojo = % bajo 60; paneo estéreo = longitud del país; clic en país = recorrido 4→9 h.

**Rationale**
- Relación entre dos variables continuas → posición en eje común (Cleveland & McGill); barras esconderían la dispersión (Anscombe).
- El mapa dejó de codificar promedios por país porque los datos no varían entre países (74,6–75,2); se usa para filtrar y mostrar que la pendiente se repite (7,3–7,6). Las 9 líneas en el mismo eje comparan mejor que colores en el mapa.
- Eje Y completo y velocidad/casillas proporcionales: eliminan el lie factor ≈ 3,8–4,8 del prototipo B.
- Shneiderman: overview (título + líneas), filter (mapa, filtros), details (panel del tramo, tooltip).
- Frecuencias naturales para público no experto (cáps. 05). Un color de acento para el dato principal y rojo solo para "bajo 60" (preatentivo).
- Sonido con íconos auditivos (teclado, error del computador), que no requieren aprender un código; ritmo y tipo de sonido cambian con el dato, no el volumen (checklist). Imagen y sonido van sincronizados (gato ↔ tecleo, rojo ↔ error), y el paneo conecta el sonido con el mapa.

**Qué se descartó**
- Mapa coroplético con promedios por país (sin variación → no comunica; con escala ajustada, exageraría).
- Normalizar min–max a los extremos visuales (lie factor).
- Graficar los 30.000 puntos (sobre-trazado, carga lenta).
- Sonido abstracto (nota que sube + capa "áspera"): necesitaba leyenda y no se relacionaba con lo visual.
- Cargar el CSV y el mapa desde internet en el navegador (riesgo de falla en la revisión).

## 5. R1 — revisión con el equipo docente

- **Fecha:** [COMPLETAR]
- **Síntesis de lo discutido:** [COMPLETAR con los apuntes tomados durante la revisión]
- **Decisiones (máx. 10 líneas):** por cada comentario → ¿adoptamos o descartamos? ¿por qué? ¿dónde se nota en la V2? [COMPLETAR]

## 6. V2 — primera iteración de diseño
**Identificación:** V2 · [fecha] · tag `v2` · commit [COMPLETAR]
**Evidencia:** [COMPLETAR] · **Qué cambió:** [COMPLETAR] · **Rationale:** [COMPLETAR] · **Qué se descartó:** [COMPLETAR]

## 7. R2 — revisión entre pares
- **Fecha / grupo que nos revisó:** [COMPLETAR] · **Síntesis:** [COMPLETAR] · **Decisiones:** [COMPLETAR]

## 8. V3 — segunda iteración de diseño
**Identificación:** V3 · [fecha] · tag `v3` · commit [COMPLETAR]
**Evidencia:** [COMPLETAR] · **Qué cambió:** [COMPLETAR] · **Rationale:** [COMPLETAR] · **Qué se descartó:** [COMPLETAR]

## 9. R3 — revisión con el equipo docente
- **Fecha:** [COMPLETAR] · **Síntesis:** [COMPLETAR] · **Decisiones:** [COMPLETAR]

## 10. V4 — la versión final
**Identificación:** V4 · [fecha] · tag `v4` · commit [COMPLETAR]
**Evidencia:** [COMPLETAR] · **Qué cambió:** [COMPLETAR] · **Rationale:** [COMPLETAR] · **Qué se descartó / qué decidimos NO cambiar y por qué:** [COMPLETAR]

---

## 11. El feedback al otro grupo (R2)
- **El proyecto evaluado (máx. 5 líneas):** [COMPLETAR]
- **El feedback que dimos (máx. 12 líneas):** [COMPLETAR — anclado en principios: "el eje truncado exagera…", no "se ve raro"]
- **Lo que nos llevamos (máx. 5 líneas):** [COMPLETAR]

---

## 12. Evaluación con usuarios — hoja del observador (ronda 1)

- **Pensador y fecha:** [COMPLETAR — persona externa al grupo que nunca vio la viz]
- **Instrucción inicial (leerla igual a cada persona):** "Explora esta página diciendo en voz alta todo lo que piensas. Cuando escuches sonidos, di qué crees que significan. No te vamos a ayudar."

**Bitácora** (cada ~30 s o cuando cambie lo que hace; cita literal, no interpretación)

| Tiempo | Lo que dice (literal) | Lo que hace |
|---|---|---|
| 0:00 | | |
| 0:30 | | |
| 1:00 | | |

- **Qué dijo del sonido:** [¿qué dato cree que codifica? ¿ayuda o estorba?]
- **Heurísticas que fallaron:** ☐ importancia del dato no clara · ☐ distancias visuales engañan · ☐ falta contexto · ☐ saturación · ☐ el color confunde · ☐ interacción no descubrible · ☐ el sonido no se entiende sin explicación
- **Cierre:** ¿dónde se atascó más? · ¿qué hipótesis dijo que resultó equivocada? · ¿qué cambio concreto sale?
- **Efecto en el proceso:** se incorporó en la transición V_ → V_ (o por qué no).
