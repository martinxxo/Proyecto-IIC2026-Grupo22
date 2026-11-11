"use strict";

const VENTANA = 3.0;
const TIEMPO_PARADA = 1.5;
const LIMPIEZA_TEXTO_MS = 1200;

const VELOCIDADES_AUDIO = {
    BAJA: 0.9,
    MEDIA: 1.75,
    ALTA: 2.85
};

const VOLUMENES_AUDIO = {
    BAJA: 0.28,
    MEDIA: 0.58,
    ALTA: 0.95
};

const DATOS = {
    BAJA: {
        horas: 5.51,
        rango: "30–68",
        registros: 10550,
        color: "#e88f9c",
        porcentaje: 25
    },
    MEDIA: {
        horas: 6.53,
        rango: "69–84",
        registros: 9674,
        color: "#f2b544",
        porcentaje: 60
    },
    ALTA: {
        horas: 7.55,
        rango: "85–100",
        registros: 9776,
        color: "#2ecc71",
        porcentaje: 100
    }
};

const elementos = {
    nivel: document.getElementById("nivel"),
    sueno: document.getElementById("sueno"),
    rango: document.getElementById("rango"),
    registros: document.getElementById("registros"),
    ritmo: document.getElementById("ritmo"),
    progreso: document.getElementById("progreso"),
    descripcion: document.getElementById("descripcion"),
    entrada: document.getElementById("entrada"),
    botonSonido: document.getElementById("boton-sonido"),
    audioTeclado: document.getElementById("audio-teclado"),
    estado: document.getElementById("estado")
};

let pulsaciones = [];
let ultimaTecla = null;
let nivelActual = "DETENIDO";
let sonidoActivo = true;
let temporizadorLimpieza = null;
let ultimoValor = "";
let inicioAudioPendiente = false;
let ultimoIntentoAudio = 0;

const audioTeclado = elementos.audioTeclado;

audioTeclado.volume = 0.35;
audioTeclado.loop = true;
audioTeclado.preload = "auto";

if ("preservesPitch" in audioTeclado) {
    audioTeclado.preservesPitch = false;
}

function mostrarEstado(mensaje, color = "#67c7ce") {
    elementos.estado.textContent = "● " + mensaje;
    elementos.estado.style.color = color;
}

function obtenerTiempo() {
    return performance.now() / 1000;
}

function limpiarTexto() {
    elementos.entrada.value = "";
    ultimoValor = "";
    temporizadorLimpieza = null;
}

function registrarPulsacion() {
    const ahora = obtenerTiempo();

    pulsaciones.push(ahora);
    ultimaTecla = ahora;

    if (temporizadorLimpieza !== null) {
        clearTimeout(temporizadorLimpieza);
    }

    temporizadorLimpieza = setTimeout(() => {
        limpiarTexto();
    }, LIMPIEZA_TEXTO_MS);

    actualizar();
}

function calcular() {
    const ahora = obtenerTiempo();

    pulsaciones = pulsaciones.filter(
        tiempo => ahora - tiempo <= VENTANA
    );

    const ritmo = pulsaciones.length / VENTANA;

    if (
        ultimaTecla === null ||
        ahora - ultimaTecla >= TIEMPO_PARADA
    ) {
        return {
            nivel: "DETENIDO",
            ritmo
        };
    }

    if (ritmo < 3) {
        return {
            nivel: "BAJA",
            ritmo
        };
    }

    if (ritmo < 6) {
        return {
            nivel: "MEDIA",
            ritmo
        };
    }

    return {
        nivel: "ALTA",
        ritmo
    };
}

function calcularParametrosDinero(nivel, ritmo) {
    const factorRitmo = Math.min(1, Math.max(0, ritmo / 8));
    const baseVel = VELOCIDADES_AUDIO[nivel] ?? 1.0;
    const baseVol = VOLUMENES_AUDIO[nivel] ?? 0.35;

    const velocidad = Math.min(
        3.6,
        Math.max(0.75, baseVel * 0.75 + (0.75 + factorRitmo * 2.4) * 0.25)
    );
    const volumen = Math.min(
        1.0,
        Math.max(0.18, baseVol * 0.7 + (0.2 + factorRitmo * 0.8) * 0.3)
    );

    return { velocidad, volumen };
}

function detenerAudio() {
    audioTeclado.pause();
}

function intentarReproducirAudio(colorIndicador = "#67c7ce") {
    if (!sonidoActivo || nivelActual === "DETENIDO") {
        return;
    }

    if (!audioTeclado.paused || inicioAudioPendiente) {
        return;
    }

    const ahora = performance.now();

    if (ahora - ultimoIntentoAudio < 250) {
        return;
    }

    ultimoIntentoAudio = ahora;
    inicioAudioPendiente = true;

    const resultado = audioTeclado.play();

    if (resultado && typeof resultado.then === "function") {
        resultado
            .then(() => {
                mostrarEstado(
                    "Sonido de dinero activo (mayor ganancia a mayor productividad)",
                    colorIndicador
                );
            })
            .catch(error => {
                if (error.name !== "AbortError") {
                    mostrarEstado(
                        "Audio no disponible: " + error.name,
                        "#e8705f"
                    );
                    console.error(
                        "Error de reproducción:",
                        error
                    );
                }
            })
            .finally(() => {
                inicioAudioPendiente = false;
            });
    } else {
        inicioAudioPendiente = false;
    }
}

function actualizarAudioDinero(nivel, ritmo = 0) {
    if (!sonidoActivo || nivel === "DETENIDO") {
        detenerAudio();
        return;
    }

    const { velocidad, volumen } = calcularParametrosDinero(nivel, ritmo);

    audioTeclado.playbackRate = velocidad;
    audioTeclado.volume = volumen;

    const colorEstado = DATOS[nivel] ? DATOS[nivel].color : "#67c7ce";
    intentarReproducirAudio(colorEstado);
}

function actualizar() {
    const resultado = calcular();
    const nivel = resultado.nivel;
    const ritmo = resultado.ritmo;

    elementos.ritmo.textContent =
        `${ritmo.toFixed(1)} teclas/s`;

    if (nivel === "DETENIDO") {
        elementos.nivel.textContent = "DETENIDO";
        elementos.nivel.style.color = "#a4a9c4";

        elementos.sueno.textContent = "-- horas";
        elementos.sueno.style.color = "#67c7ce";

        elementos.ritmo.style.color = "#eceaf4";
        elementos.rango.textContent = "Sin actividad";

        elementos.registros.textContent =
            "30.000 registros sintéticos";

        elementos.descripcion.textContent =
            "Escribe para descubrir el descanso promedio " +
            "asociado a distintos niveles de productividad.";

        elementos.progreso.style.width = "0%";
        elementos.entrada.style.borderColor = "#353b61";

        if (sonidoActivo) {
            elementos.botonSonido.style.color = "#67c7ce";
            mostrarEstado("Visualización interactiva lista", "#67c7ce");
        }
    } else {
        const datos = DATOS[nivel];
        const esAlta = nivel === "ALTA";

        elementos.nivel.textContent = nivel;
        elementos.nivel.style.color = datos.color;

        elementos.sueno.textContent =
            `${datos.horas.toFixed(2)} horas`;
        elementos.sueno.style.color = esAlta ? datos.color : "#67c7ce";

        elementos.ritmo.style.color = esAlta ? datos.color : "#eceaf4";

        elementos.rango.textContent =
            `Productividad del dataset: ${datos.rango}`;

        elementos.registros.textContent =
            `${datos.registros.toLocaleString("es-CL")} ` +
            "registros del grupo";

        elementos.descripcion.textContent =
            `En los datos de E1, el grupo de productividad ` +
            `${nivel.toLowerCase()} presenta un promedio de ` +
            `${datos.horas.toFixed(2)} horas de sueño.`;

        elementos.progreso.style.width =
            `${datos.porcentaje}%`;

        elementos.progreso.style.backgroundColor =
            datos.color;

        elementos.entrada.style.borderColor = esAlta ? datos.color : "#67c7ce";

        if (sonidoActivo) {
            elementos.botonSonido.style.color = esAlta ? datos.color : "#67c7ce";
            mostrarEstado(
                `Productividad ${nivel.toLowerCase()} · Sonido de dinero activo`,
                esAlta ? datos.color : "#67c7ce"
            );
        }
    }

    nivelActual = nivel;
    actualizarAudioDinero(nivel, ritmo);
}

elementos.entrada.addEventListener("keydown", evento => {
    if (
        evento.key === "Enter" ||
        evento.key === "ArrowUp" ||
        evento.key === "ArrowDown"
    ) {
        evento.preventDefault();
    }

    if (!sonidoActivo) {
        return;
    }

    if (evento.ctrlKey || evento.altKey || evento.metaKey) {
        return;
    }

    if (evento.key.length === 1 && !evento.repeat) {
        const ahora = obtenerTiempo();
        const pulsacionesRecientes = pulsaciones.filter(
            tiempo => ahora - tiempo <= VENTANA
        );

        const ritmoEstimado =
            (pulsacionesRecientes.length + 1) / VENTANA;

        const nivelEstimado =
            ritmoEstimado < 3
                ? "BAJA"
                : ritmoEstimado < 6
                    ? "MEDIA"
                    : "ALTA";

        nivelActual = nivelEstimado;
        actualizarAudioDinero(nivelEstimado, ritmoEstimado);
    }
});

elementos.entrada.addEventListener("input", evento => {
    const valor = elementos.entrada.value;

    if (evento.inputType === "insertText") {
        const diferencia =
            valor.length - ultimoValor.length;

        if (diferencia > 0) {
            registrarPulsacion();
        }
    }

    ultimoValor = valor;

    if (valor.length >= 80) {
        limpiarTexto();
    }
});

elementos.entrada.addEventListener("paste", evento => {
    evento.preventDefault();
});

elementos.botonSonido.addEventListener("click", () => {
    sonidoActivo = !sonidoActivo;

    elementos.botonSonido.textContent = sonidoActivo
        ? "Sonido: ACTIVADO"
        : "Sonido: DESACTIVADO";

    const colorActivo =
        nivelActual === "ALTA" ? DATOS.ALTA.color : "#67c7ce";

    elementos.botonSonido.style.color = sonidoActivo
        ? colorActivo
        : "#a4a9c4";

    if (sonidoActivo) {
        mostrarEstado("Sonido de dinero habilitado", colorActivo);
        const resultado = calcular();
        actualizarAudioDinero(resultado.nivel, resultado.ritmo);
    } else {
        detenerAudio();
        mostrarEstado("Sonido desactivado", "#a4a9c4");
    }

    elementos.entrada.focus();
});

audioTeclado.addEventListener("error", () => {
    mostrarEstado(
        "Error: comprueba el archivo audio.mp3",
        "#e8705f"
    );
});

window.addEventListener("blur", () => {
    pulsaciones = [];
    ultimaTecla = null;
    actualizar();
});

document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        pulsaciones = [];
        ultimaTecla = null;
        actualizar();
    }
});

setInterval(actualizar, 100);

actualizar();
elementos.entrada.focus();
