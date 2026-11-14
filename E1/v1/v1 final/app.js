/* =========================================================================
   Sueño vs productividad en 9 países — V1
   Datos: data/datos.js (RESUMEN, BINS, PAISES, BINS_PAIS, PUNTOS) y
          data/mundo.js (MUNDO), generados por scripts/preparar_datos.py

   Una sola visualización con tres vistas coordinadas (mantra de Shneiderman):
   - Overview:          título + gráfico con la línea de los 9 países superpuestas
   - Zoom & filter:     MAPA (elegir país) + botones que filtran la nube
   - Details on demand: al recorrer las horas (mouse, slider o flechas) el
                        panel inferior muestra ese tramo en ese país.
   El sonido sigue la misma lógica: clic en un país = se escucha su recorrido
   de 4 a 9 h, ubicado a la izquierda o derecha según dónde está en el mapa.
   ========================================================================= */

const fmt1 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt0 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const fmtHora = h => (Number.isInteger(h) ? fmt0.format(h) : fmt1.format(h));

const NOMBRES = {
    "Australia": "Australia", "Canada": "Canadá", "China": "China", "Germany": "Alemania",
    "India": "India", "Japan": "Japón", "South Korea": "Corea del Sur", "UK": "Reino Unido", "USA": "EE. UU.",
};
// nombre en el mapa (world-atlas) -> nombre en el dataset
const MAPA_A_DATOS = { "United States of America": "USA", "United Kingdom": "UK" };

// ---------- Estado ----------
const estado = {
    pais: null,        // null = los 9 países
    tramo: 4,          // índice del tramo de 30 min
    filtro: "todos",   // todos | burnout | sano
};
const binsActuales = () => (estado.pais ? BINS_PAIS[estado.pais] : BINS);
const nombreActual = () => (estado.pais ? NOMBRES[estado.pais] : "los 9 países");

/* =========================================================================
   1. MAPA
   ========================================================================= */
const MW = 600, MH = 310;
const mapaSvg = d3.select("#mapa").attr("viewBox", `0 0 ${MW} ${MH}`);
const tooltipMapa = document.getElementById("tooltipMapa");

const paisesMundo = topojson.feature(MUNDO, MUNDO.objects.countries).features
    .filter(f => f.properties.name !== "Antarctica" && f.properties.name !== "Fr. S. Antarctic Lands");
const proyeccion = d3.geoNaturalEarth1().fitSize([MW, MH], { type: "FeatureCollection", features: paisesMundo });
const ruta = d3.geoPath(proyeccion);

const claveDe = f => {
    const n = MAPA_A_DATOS[f.properties.name] || f.properties.name;
    return PAISES[n] ? n : null;
};

// paneo estéreo = longitud del centroide del país (América izquierda, Asia derecha)
const PANEO = {};
paisesMundo.forEach(f => {
    const k = claveDe(f);
    if (k) PANEO[k] = Math.max(-0.9, Math.min(0.9, d3.geoCentroid(f)[0] / 140));
});

// fondo (clic en el océano = volver a los 9 países)
mapaSvg.append("rect").attr("class", "fondo").attr("width", MW).attr("height", MH)
    .on("click", () => seleccionarPais(null));

const pathsPais = mapaSvg.append("g").selectAll("path")
    .data(paisesMundo).join("path")
    .attr("d", ruta)
    .attr("class", f => (claveDe(f) ? "tierra con-datos" : "tierra"))
    .attr("tabindex", f => (claveDe(f) ? 0 : null))
    .attr("role", f => (claveDe(f) ? "button" : null))
    .attr("aria-label", f => (claveDe(f) ? `Ver ${NOMBRES[claveDe(f)]}` : null));

pathsPais.filter(f => claveDe(f))
    .on("click", (e, f) => { e.stopPropagation(); const k = claveDe(f); seleccionarPais(estado.pais === k ? null : k, { desdeClic: true }); })
    .on("keydown", (e, f) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); seleccionarPais(claveDe(f), { desdeClic: true }); } })
    .on("pointerenter", (e, f) => mostrarTooltip(e, claveDe(f)))
    .on("pointermove", (e, f) => mostrarTooltip(e, claveDe(f)))
    .on("pointerleave", () => { tooltipMapa.hidden = true; });

// clic en un país sin datos = volver a los 9 países
pathsPais.filter(f => !claveDe(f)).on("click", () => seleccionarPais(null));

// Marcadores en el centroide de cada país: Japón, Corea o Reino Unido son muy
// pequeños para hacerles clic; el círculo invisible amplía la zona clicable.
const centroides = paisesMundo.filter(f => claveDe(f)).map(f => {
    const k = claveDe(f);
    // EE. UU. y Canadá: centroide geográfico cae bien; se usa el de la geometría
    return { k, xy: ruta.centroid(f) };
});
const marcas = mapaSvg.append("g").selectAll("g").data(centroides).join("g")
    .attr("transform", d => `translate(${d.xy[0]},${d.xy[1]})`)
    .style("cursor", "pointer")
    .on("click", (e, d) => { e.stopPropagation(); seleccionarPais(estado.pais === d.k ? null : d.k, { desdeClic: true }); })
    .on("pointerenter", (e, d) => { mostrarTooltip(e, d.k); pathsPais.classed("hover", f => claveDe(f) === d.k); })
    .on("pointermove", (e, d) => mostrarTooltip(e, d.k))
    .on("pointerleave", () => { tooltipMapa.hidden = true; pathsPais.classed("hover", false); });
marcas.append("circle").attr("r", 13).attr("fill", "transparent");
marcas.append("circle").attr("class", "marca").attr("r", 4.5);

function mostrarTooltip(e, k) {
    const d = PAISES[k];
    const [px, py] = d3.pointer(e, document.querySelector(".mapa-contenedor"));
    tooltipMapa.innerHTML = `<b>${NOMBRES[k]}</b> · ${fmt0.format(d.n)} trabajadores<br>` +
        `+${fmt1.format(d.pendiente)} puntos por hora de sueño`;
    tooltipMapa.style.left = `${px}px`;
    tooltipMapa.style.top = `${py}px`;
    tooltipMapa.hidden = false;
}

// Chips: alternativa accesible al mapa y "leyenda" con la pendiente de cada país
const chipsDatos = [null, ...Object.keys(PAISES).sort((a, b) => NOMBRES[a].localeCompare(NOMBRES[b], "es"))];
const chips = d3.select("#paises").selectAll("button").data(chipsDatos).join("button")
    .attr("class", "chip")
    .html(k => k === null
        ? `Los 9 países<span>+${fmt1.format(RESUMEN.pendiente)}</span>`
        : `${NOMBRES[k]}<span>+${fmt1.format(PAISES[k].pendiente)}</span>`)
    .on("click", (e, k) => seleccionarPais(k, { desdeClic: true }))
    .on("pointerenter", (e, k) => pathsPais.classed("hover", f => k && claveDe(f) === k))
    .on("pointerleave", () => pathsPais.classed("hover", false));

/* =========================================================================
   2. GRÁFICO
   ========================================================================= */
const W = 640, H = 400;
const M = { top: 30, right: 20, bottom: 48, left: 46 };
const x = d3.scaleLinear().domain([RESUMEN.minHoras, RESUMEN.maxHoras]).range([M.left, W - M.right]);
const y = d3.scaleLinear().domain([0, 100]).range([H - M.bottom, M.top]);   // eje Y completo: sin truncar
const svg = d3.select("#grafico").attr("viewBox", `0 0 ${W} ${H}`);

svg.append("g").attr("class", "grilla").selectAll("line").data([25, 50, 75, 100]).join("line")
    .attr("x1", M.left).attr("x2", W - M.right).attr("y1", d => y(d)).attr("y2", d => y(d));
svg.append("g").attr("class", "eje").attr("transform", `translate(0,${H - M.bottom})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat(d => `${fmtHora(d)} h`).tickSizeOuter(0));
svg.append("g").attr("class", "eje").attr("transform", `translate(${M.left},0)`)
    .call(d3.axisLeft(y).tickValues([0, 25, 50, 75, 100]).tickSizeOuter(0));
svg.append("text").attr("class", "titulo-eje").attr("x", W - M.right).attr("y", H - 10)
    .attr("text-anchor", "end").text("Horas de sueño por noche");
svg.append("text").attr("class", "titulo-eje").attr("x", M.left).attr("y", M.top - 14)
    .text("Puntaje de productividad (0–100)");

const tramoSel = svg.append("rect").attr("class", "tramo-sel").attr("y", M.top).attr("height", H - M.bottom - M.top);

// Nube: 300 trabajadores por país (2.700). Jitter reproducible para no apilar puntos.
const aleatorio = d3.randomLcg(22);
const jitter = a => (aleatorio() - 0.5) * a;
const puntos = svg.append("g").selectAll("circle").data(PUNTOS).join("circle")
    .attr("class", "punto")
    .attr("cx", d => x(Math.min(RESUMEN.maxHoras, Math.max(RESUMEN.minHoras, d[0] + jitter(0.09)))))
    .attr("cy", d => y(Math.min(100, d[1] + jitter(0.8))))
    .attr("r", 2);

function pintarPuntos() {
    const { pais, filtro } = estado;
    puntos
        .attr("fill", d => (filtro === "burnout" && d[2]) ? "var(--brasa)" : "var(--luna)")
        .attr("opacity", d => {
            if (pais && d[3] !== pais) return 0.03;
            const base = pais ? 0.45 : 0.18;
            if (filtro === "todos") return base;
            if (filtro === "burnout") return d[2] ? 0.8 : 0.04;
            return d[2] ? 0.04 : base + 0.1;
        });
}

// Las 9 líneas de países, siempre visibles como contexto (small multiples superpuestos)
const linea = d3.line().x(d => x(d.centro)).y(d => y(d.prod)).curve(d3.curveMonotoneX);
const area = d3.area().x(d => x(d.centro)).y0(d => y(d.p25)).y1(d => y(d.p75)).curve(d3.curveMonotoneX);

const banda = svg.append("path").attr("class", "banda");
svg.append("g").selectAll("path").data(Object.keys(PAISES)).join("path")
    .attr("class", "linea-pais").attr("d", k => linea(BINS_PAIS[k]));
const trazo = svg.append("path").attr("class", "promedio");
const nodos = svg.append("g").selectAll("circle").data(d3.range(BINS.length)).join("circle")
    .attr("class", "nodo").attr("r", 4.5);

const xNota = W - M.right - 8;
const notaPrincipal = svg.append("text").attr("class", "anotacion").attr("text-anchor", "end")
    .attr("x", xNota).attr("y", y(28));
svg.append("text").attr("class", "anotacion suave").attr("text-anchor", "end")
    .attr("x", xNota).attr("y", y(28) + 18).text("Línea gruesa: promedio cada 30 min · banda: mitad central");
svg.append("text").attr("class", "anotacion suave").attr("text-anchor", "end")
    .attr("x", xNota).attr("y", y(28) + 36).text("Líneas grises: cada uno de los 9 países");

const cursor = svg.append("line").attr("class", "cursor").attr("y1", M.top).attr("y2", H - M.bottom);
const etiqueta = svg.append("text").attr("class", "etiqueta-sel").attr("text-anchor", "middle");

const capa = svg.append("rect").attr("x", M.left).attr("y", M.top)
    .attr("width", W - M.left - M.right).attr("height", H - M.top - M.bottom).attr("fill", "transparent");

function tramoDesdeEvento(e) {
    const horas = x.invert(d3.pointer(e, svg.node())[0]);
    const i = BINS.findIndex(b => horas >= b.desde && horas < b.hasta);
    return i === -1 ? (horas < BINS[0].desde ? 0 : BINS.length - 1) : i;
}
capa.on("pointermove", e => { if (recorriendo()) detenerRecorrido(); seleccionarTramo(tramoDesdeEvento(e)); });
capa.on("pointerdown", e => { capa.node().setPointerCapture(e.pointerId); seleccionarTramo(tramoDesdeEvento(e), { forzar: true }); });

function dibujarCurva(animar) {
    const bins = binsActuales();
    const t = animar ? svg.transition().duration(450) : null;
    (t ? banda.datum(bins).transition(t) : banda.datum(bins)).attr("d", area);
    (t ? trazo.datum(bins).transition(t) : trazo.datum(bins)).attr("d", linea);
    (t ? nodos.transition(t) : nodos).attr("cx", i => x(bins[i].centro)).attr("cy", i => y(bins[i].prod));
    const pend = estado.pais ? PAISES[estado.pais].pendiente : RESUMEN.pendiente;
    notaPrincipal.text(`${estado.pais ? NOMBRES[estado.pais] : "9 países"}: +${fmt1.format(pend)} puntos por cada hora extra`);
}

/* =========================================================================
   3. DETALLE
   ========================================================================= */
const tareas = d3.select("#tareas").selectAll(".tarea").data(d3.range(10)).join("div").attr("class", "tarea");
tareas.append("div").attr("class", "relleno");
const personas = d3.select("#personas").selectAll(".persona").data(d3.range(100)).join("div").attr("class", "persona");
const video = document.getElementById("videoGato");
const slider = document.getElementById("selectorHoras");
slider.max = BINS.length - 1;

function actualizarDetalle() {
    const b = binsActuales()[estado.tramo];
    const i = estado.tramo;

    tramoSel.attr("x", x(b.desde)).attr("width", x(b.hasta) - x(b.desde));
    cursor.attr("x1", x(b.centro)).attr("x2", x(b.centro));
    etiqueta.attr("x", x(b.centro)).attr("y", y(b.p75) - 10).text(fmt0.format(b.prod));
    nodos.classed("sel", j => j === i).attr("r", j => (j === i ? 7 : 4.5));

    document.getElementById("txtTitulo").innerHTML =
        `En <b>${nombreActual()}</b>, quienes duermen entre ${fmtHora(b.desde)} y ${fmtHora(b.hasta)} horas`;
    document.getElementById("txtProd").textContent = fmt0.format(b.prod);
    document.getElementById("txtRango").textContent = `${fmt0.format(b.p25)} a ${fmt0.format(b.p75)} puntos`;
    const porCien = Math.round(b.burnout * 100);
    document.getElementById("txtBurnout").textContent = porCien < 1 ? "menos de 1" : porCien;
    document.getElementById("txtN").textContent =
        `Basado en ${fmt0.format(b.n)} trabajadores${estado.pais ? " de " + NOMBRES[estado.pais] : ""} en este tramo.`;

    tareas.select(".relleno").style("width", k => `${Math.max(0, Math.min(1, (b.prod - k * 10) / 10)) * 100}%`);
    personas.classed("riesgo", k => k < porCien);

    // El gato y el sonido del teclado van a la MISMA velocidad, proporcional a la productividad:
    // video: productividad / 75 (1× = promedio de todos) · teclado: productividad / 10 teclas por segundo
    const velocidad = b.prod / RESUMEN.prodPromedio;
    video.playbackRate = velocidad;
    document.getElementById("txtVelocidad").textContent =
        `${fmt1.format(velocidad)}× · ${fmt1.format(b.prod / 10)} teclas/s`;
    Sonido.actualizar(b.prod, b.burnout, paneoActual());
    slider.value = i;
}

/* =========================================================================
   4. ACCIONES (coordinan las tres vistas y el sonido)
   ========================================================================= */
const paneoActual = () => (estado.pais ? PANEO[estado.pais] : 0);

function seleccionarTramo(i, opciones = {}) {
    if (i === estado.tramo && !opciones.forzar) return;
    estado.tramo = i;
    actualizarDetalle();
}

function seleccionarPais(k, opciones = {}) {
    estado.pais = k;
    pathsPais.classed("sel", f => k && claveDe(f) === k);
    marcas.select(".marca").classed("sel", d => d.k === k);
    chips.classed("activo", d => d === k).attr("aria-pressed", d => d === k);
    pintarPuntos();
    dibujarCurva(true);
    actualizarDetalle();
    // Un clic en el mapa es un gesto del usuario: se aprovecha para activar el sonido
    if (opciones.desdeClic && !Sonido.activo && !sonidoSilenciadoPorUsuario) {
        Sonido.activar();
        actualizarBotonSonido();
    }
    if (Sonido.activo && opciones.desdeClic) recorrer();
    else detenerRecorrido();
}

// Recorrido auditivo 4 -> 9 h del país actual (se cancela si se elige otro)
let recorridoId = 0;
let recorridoActivo = false;
const recorriendo = () => recorridoActivo;
function detenerRecorrido() { recorridoId++; recorridoActivo = false; btnRecorrido.disabled = false; }
function recorrer() {
    const id = ++recorridoId;
    recorridoActivo = true;
    Sonido.activar();
    actualizarBotonSonido();
    btnRecorrido.disabled = true;
    const PASO_MS = 900;    // tiempo para escuchar cada tramo antes de pasar al siguiente
    let i = 0;
    const avanzar = () => {
        if (id !== recorridoId) return;
        estado.tramo = i;
        actualizarDetalle();
        i++;
        if (i < BINS.length) setTimeout(avanzar, PASO_MS);
        else setTimeout(() => { if (id === recorridoId) { recorridoActivo = false; btnRecorrido.disabled = false; } }, PASO_MS);
    };
    avanzar();
}

slider.addEventListener("input", () => { detenerRecorrido(); seleccionarTramo(Number(slider.value), { forzar: true }); });
svg.on("pointerdown.cancelar", () => detenerRecorrido());

document.querySelectorAll(".filtro").forEach(boton => {
    boton.addEventListener("click", () => {
        document.querySelectorAll(".filtro").forEach(b => {
            b.classList.toggle("activo", b === boton);
            b.setAttribute("aria-pressed", b === boton);
        });
        estado.filtro = boton.dataset.filtro;
        pintarPuntos();
    });
});

const btnSonido = document.getElementById("btnSonido");
const btnRecorrido = document.getElementById("btnRecorrido");
let sonidoSilenciadoPorUsuario = false;
function actualizarBotonSonido() {
    btnSonido.setAttribute("aria-pressed", Sonido.activo);
    btnSonido.textContent = Sonido.activo ? "🔊 Sonido activado" : "🔈 Activar sonido";
}
btnSonido.addEventListener("click", () => {
    if (Sonido.activo) { Sonido.desactivar(); detenerRecorrido(); sonidoSilenciadoPorUsuario = true; }
    else { Sonido.activar(); sonidoSilenciadoPorUsuario = false; actualizarDetalle(); }
    actualizarBotonSonido();
});
btnRecorrido.addEventListener("click", () => { sonidoSilenciadoPorUsuario = false; recorrer(); });

// Teclado: flechas recorren las horas
document.addEventListener("keydown", e => {
    if (document.activeElement === slider) return;
    if (e.key === "ArrowRight") seleccionarTramo(Math.min(BINS.length - 1, estado.tramo + 1));
    if (e.key === "ArrowLeft") seleccionarTramo(Math.max(0, estado.tramo - 1));
});

// Slider alineado con los centros de los tramos del eje X
function alinearSlider() {
    const escala = svg.node().getBoundingClientRect().width / W;
    const pulgar = 16;
    slider.style.marginLeft = `${x(BINS[0].centro) * escala - pulgar / 2}px`;
    slider.style.width = `${(x(BINS[BINS.length - 1].centro) - x(BINS[0].centro)) * escala + pulgar}px`;
}
window.addEventListener("resize", alinearSlider);

// Cada "error" que se escucha hace parpadear en rojo el marco del gato
const marcoGato = document.querySelector(".gato-marco");
Sonido.alError(() => {
    marcoGato.classList.remove("error");
    void marcoGato.offsetWidth;          // reinicia la animación
    marcoGato.classList.add("error");
});

/* ---------- Estado inicial ---------- */
document.getElementById("txtR").textContent = RESUMEN.r.toLocaleString("es-CL", { maximumFractionDigits: 2 });
pintarPuntos();
dibujarCurva(false);
seleccionarPais(null);
alinearSlider();

// único momento animado al cargar: la línea principal se dibuja
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const largo = trazo.node().getTotalLength();
    trazo.attr("stroke-dasharray", largo).attr("stroke-dashoffset", largo)
        .transition().duration(1200).ease(d3.easeCubicOut).attr("stroke-dashoffset", 0)
        .on("end", () => trazo.attr("stroke-dasharray", null));
}
