const fmt1 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt0 = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 0 });
const fmtHora = h => (Number.isInteger(h) ? fmt0.format(h) : fmt1.format(h));

const NOMBRES = {
    "Australia": "Australia",
    "Canada": "Canadá",
    "China": "China",
    "Germany": "Alemania",
    "India": "India",
    "Japan": "Japón",
    "South Korea": "Corea del Sur",
    "UK": "Reino Unido",
    "USA": "EE. UU."
};

const MAPA_A_DATOS = {
    "United States of America": "USA",
    "United Kingdom": "UK"
};

const estado = {
    pais: null,
    tramo: 4,
    burnout: "no"
};

const nombreActual = () => estado.pais ? NOMBRES[estado.pais] : "los 9 países";

const MW = 600;
const MH = 310;

const mapaSvg = d3.select("#mapa").attr("viewBox", `0 0 ${MW} ${MH}`);
const tooltipMapa = document.getElementById("tooltipMapa");

const paisesMundo = topojson.feature(MUNDO, MUNDO.objects.countries).features
    .filter(f => f.properties.name !== "Antarctica" && f.properties.name !== "Fr. S. Antarctic Lands");

const proyeccion = d3.geoNaturalEarth1().fitSize(
    [MW, MH],
    {
        type: "FeatureCollection",
        features: paisesMundo
    }
);

const ruta = d3.geoPath(proyeccion);

const claveDe = f => {
    const n = MAPA_A_DATOS[f.properties.name] || f.properties.name;
    return PAISES[n] ? n : null;
};

mapaSvg.append("rect")
    .attr("class", "fondo")
    .attr("width", MW)
    .attr("height", MH)
    .on("click", () => seleccionarPais(null));

const pathsPais = mapaSvg.append("g")
    .selectAll("path")
    .data(paisesMundo)
    .join("path")
    .attr("d", ruta)
    .attr("class", f => claveDe(f) ? "tierra con-datos" : "tierra")
    .attr("tabindex", f => claveDe(f) ? 0 : null)
    .attr("role", f => claveDe(f) ? "button" : null)
    .attr("aria-label", f => claveDe(f) ? `Ver ${NOMBRES[claveDe(f)]}` : null);

pathsPais.filter(f => claveDe(f))
    .on("click", (e, f) => {
        e.stopPropagation();
        const k = claveDe(f);
        seleccionarPais(estado.pais === k ? null : k);
    })
    .on("keydown", (e, f) => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            seleccionarPais(claveDe(f));
        }
    })
    .on("pointerenter", (e, f) => mostrarTooltip(e, claveDe(f)))
    .on("pointermove", (e, f) => mostrarTooltip(e, claveDe(f)))
    .on("pointerleave", () => {
        tooltipMapa.hidden = true;
    });

pathsPais.filter(f => !claveDe(f))
    .on("click", () => seleccionarPais(null));

const centroides = paisesMundo
    .filter(f => claveDe(f))
    .map(f => ({
        k: claveDe(f),
        xy: ruta.centroid(f)
    }));

const marcas = mapaSvg.append("g")
    .selectAll("g")
    .data(centroides)
    .join("g")
    .attr("transform", d => `translate(${d.xy[0]},${d.xy[1]})`)
    .style("cursor", "pointer")
    .on("click", (e, d) => {
        e.stopPropagation();
        seleccionarPais(estado.pais === d.k ? null : d.k);
    })
    .on("pointerenter", (e, d) => {
        mostrarTooltip(e, d.k);
        pathsPais.classed("hover", f => claveDe(f) === d.k);
    })
    .on("pointermove", (e, d) => mostrarTooltip(e, d.k))
    .on("pointerleave", () => {
        tooltipMapa.hidden = true;
        pathsPais.classed("hover", false);
    });

marcas.append("circle")
    .attr("r", 13)
    .attr("fill", "transparent");

marcas.append("circle")
    .attr("class", "marca")
    .attr("r", 4.5);

function mostrarTooltip(e, k) {
    const d = PAISES[k];
    const [px, py] = d3.pointer(e, document.querySelector(".mapa-contenedor"));

    tooltipMapa.innerHTML =
        `<b>${NOMBRES[k]}</b> · ${fmt0.format(d.n)} trabajadores<br>` +
        `+${fmt1.format(d.pendiente)} puntos por hora de sueño`;

    tooltipMapa.style.left = `${px}px`;
    tooltipMapa.style.top = `${py}px`;
    tooltipMapa.hidden = false;
}

const chipsDatos = [
    null,
    ...Object.keys(PAISES).sort((a, b) => NOMBRES[a].localeCompare(NOMBRES[b], "es"))
];

const chips = d3.select("#paises")
    .selectAll("button")
    .data(chipsDatos)
    .join("button")
    .attr("class", "chip")
    .attr("aria-pressed", false)
    .html(k =>
        k === null
            ? `Los 9 países<span>+${fmt1.format(RESUMEN.pendiente)}</span>`
            : `${NOMBRES[k]}<span>+${fmt1.format(PAISES[k].pendiente)}</span>`
    )
    .on("click", (e, k) => seleccionarPais(k))
    .on("pointerenter", (e, k) => {
        pathsPais.classed("hover", f => k && claveDe(f) === k);
    })
    .on("pointerleave", () => {
        pathsPais.classed("hover", false);
    });

const tareas = d3.select("#tareas")
    .selectAll(".tarea")
    .data(d3.range(10))
    .join("div")
    .attr("class", "tarea");

tareas.append("div")
    .attr("class", "relleno");

const personas = d3.select("#personas")
    .selectAll(".persona")
    .data(d3.range(100))
    .join("div")
    .attr("class", "persona");

const video = document.getElementById("videoGato");
const slider = document.getElementById("selectorHoras");
const ejeHoras = document.getElementById("ejeHoras");
const btnSinBurnout = document.getElementById("btnSinBurnout");
const btnConBurnout = document.getElementById("btnConBurnout");
const audioTeclado = document.getElementById("audioTeclado");
const btnSonido = document.getElementById("btnSonido");
const btnRecorrido = document.getElementById("btnRecorrido");

slider.max = BURNOUT.no.length - 1;

for (let i = 0; i <= BURNOUT.no.length; i++) {
    const hora = RESUMEN.minHoras + i * 0.5;
    const marca = document.createElement("span");
    marca.textContent = Number.isInteger(hora) ? `${fmt0.format(hora)} h` : `${fmt1.format(hora)} h`;
    ejeHoras.appendChild(marca);
}

let sonidoActivo = false;
let recorridoId = 0;
let recorridoActivo = false;

function datosBurnoutActuales() {
    if (estado.pais) {
        return BURNOUT_PAIS[estado.pais][estado.burnout];
    }

    return BURNOUT[estado.burnout];
}

function datoActual() {
    return datosBurnoutActuales()[estado.tramo] || null;
}

function productividadMinMax() {
    const datos = [];

    ["no", "si"].forEach(tipo => {
        const conjunto = estado.pais
            ? BURNOUT_PAIS[estado.pais][tipo]
            : BURNOUT[tipo];

        conjunto.forEach(d => {
            if (d && d.n > 0 && d.prod !== null) {
                datos.push(d.prod);
            }
        });
    });

    return {
        min: d3.min(datos),
        max: d3.max(datos)
    };
}

function proporcionProductividad(prod) {
    const rango = productividadMinMax();

    if (rango.max === rango.min) {
        return 0.5;
    }

    return Math.max(
        0,
        Math.min(
            1,
            (prod - rango.min) / (rango.max - rango.min)
        )
    );
}

function actualizarAudio(prod) {
    const proporcion = proporcionProductividad(prod);
    const minimo = 0.4;
    const maximo = 2.3;

    audioTeclado.playbackRate =
        minimo + proporcion * (maximo - minimo);
}

function actualizarDetalle() {
    const b = datoActual();

    slider.value = estado.tramo;

    btnSinBurnout.classList.toggle(
        "activo",
        estado.burnout === "no"
    );

    btnConBurnout.classList.toggle(
        "activo",
        estado.burnout === "si"
    );

    if (!b || b.n === 0 || b.prod === null) {
        document.getElementById("txtTitulo").innerHTML =
            `No hay datos suficientes para esta combinación`;

        document.getElementById("txtProd").textContent = "—";
        document.getElementById("txtBurnout").textContent = "—";

        tareas.select(".relleno")
            .style("width", "0%");

        personas.classed("riesgo", false);

        video.playbackRate = 1;

        document.getElementById("txtVelocidad").textContent = "1,0×";

        return;
    }

    const textoBurnout =
        estado.burnout === "si"
            ? "con burnout"
            : "sin burnout";

    document.getElementById("txtTitulo").innerHTML =
        `En <b>${nombreActual()}</b>, quienes duermen entre ${fmtHora(b.desde)} y ${fmtHora(b.hasta)} horas y están <b>${textoBurnout}</b>`;

    document.getElementById("txtProd").textContent =
        fmt0.format(b.prod);

    const porCien = Math.round(b.bajo60 * 100);

    document.getElementById("txtBurnout").textContent =
        porCien < 1 ? "menos de 1" : porCien;

    tareas.select(".relleno")
        .style("width", k =>
            `${Math.max(
                0,
                Math.min(
                    1,
                    (b.prod - k * 10) / 10
                )
            ) * 100}%`
        );

    personas.classed(
        "riesgo",
        k => k < porCien
    );

    const proporcion = proporcionProductividad(b.prod);

    const velocidadVideo =
        0.5 + proporcion * 1.5;

    video.playbackRate = velocidadVideo;

    document.getElementById("txtVelocidad").textContent =
        `${fmt1.format(velocidadVideo)}×`;

    actualizarAudio(b.prod);
}

function seleccionarTramo(i, opciones = {}) {
    if (i === estado.tramo && !opciones.forzar) return;

    estado.tramo = i;
    actualizarDetalle();
}

function seleccionarBurnout(tipo) {
    estado.burnout = tipo;

    btnSinBurnout.classList.toggle(
        "activo",
        tipo === "no"
    );

    btnConBurnout.classList.toggle(
        "activo",
        tipo === "si"
    );

    detenerRecorrido();
    actualizarDetalle();
}

function seleccionarPais(k) {
    estado.pais = k;

    pathsPais.classed(
        "sel",
        f => k && claveDe(f) === k
    );

    marcas.select(".marca")
        .classed(
            "sel",
            d => d.k === k
        );

    chips
        .classed(
            "activo",
            d => d === k
        )
        .attr(
            "aria-pressed",
            d => d === k
        );

    detenerRecorrido();
    actualizarDetalle();
}

function actualizarBotonSonido() {
    btnSonido.setAttribute(
        "aria-pressed",
        sonidoActivo
    );

    btnSonido.textContent =
        sonidoActivo
            ? "🔊 Sonido activado"
            : "🔈 Activar sonido";
}

function activarSonido() {
    const b = datoActual();

    if (!b || b.prod === null) return;

    sonidoActivo = true;

    actualizarAudio(b.prod);

    audioTeclado.play()
        .catch(() => {
            sonidoActivo = false;
            actualizarBotonSonido();
        });

    actualizarBotonSonido();
}

function desactivarSonido() {
    sonidoActivo = false;
    audioTeclado.pause();
    actualizarBotonSonido();
}

function detenerRecorrido() {
    recorridoId++;
    recorridoActivo = false;
    btnRecorrido.disabled = false;
}

function recorrer() {
    const id = ++recorridoId;

    recorridoActivo = true;
    btnRecorrido.disabled = true;

    if (!sonidoActivo) {
        activarSonido();
    }

    let i = 0;

    const avanzar = () => {
        if (id !== recorridoId) return;

        estado.tramo = i;
        actualizarDetalle();

        i++;

        if (i < BURNOUT.no.length) {
            setTimeout(avanzar, 900);
        } else {
            setTimeout(() => {
                if (id === recorridoId) {
                    recorridoActivo = false;
                    btnRecorrido.disabled = false;
                }
            }, 900);
        }
    };

    avanzar();
}

slider.addEventListener("input", () => {
    detenerRecorrido();

    seleccionarTramo(
        Number(slider.value),
        { forzar: true }
    );
});

btnSinBurnout.addEventListener("click", () => {
    seleccionarBurnout("no");
});

btnConBurnout.addEventListener("click", () => {
    seleccionarBurnout("si");
});

btnSonido.addEventListener("click", () => {
    if (sonidoActivo) {
        desactivarSonido();
        detenerRecorrido();
    } else {
        activarSonido();
    }
});

btnRecorrido.addEventListener("click", () => {
    recorrer();
});

document.addEventListener("keydown", e => {
    if (document.activeElement === slider) {
        return;
    }

    if (e.key === "ArrowRight") {
        detenerRecorrido();

        seleccionarTramo(
            Math.min(
                BURNOUT.no.length - 1,
                estado.tramo + 1
            )
        );
    }

    if (e.key === "ArrowLeft") {
        detenerRecorrido();

        seleccionarTramo(
            Math.max(
                0,
                estado.tramo - 1
            )
        );
    }
});

seleccionarPais(null);
actualizarBotonSonido();