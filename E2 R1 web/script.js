
"use strict";

const VENTANA = 3.0;
const TIEMPO_PARADA = 1.5;
const LIMPIEZA_TEXTO_MS = 1200;

const VELOCIDADES_AUDIO = {
    BAJA: 1.0,
    MEDIA: 2.4,
    ALTA: 3.8
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
        color: "#67c7ce",
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
    audioTeclado.preservesPitch = true;
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

function detenerAudio() {
    audioTeclado.pause();
}

function intentarReproducirAudio() {
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
                mostrarEstado("Sonido de teclado activo");
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

function actualizarAudioTeclado(nivel) {
    if (!sonidoActivo || nivel === "DETENIDO") {
        detenerAudio();
        return;
    }

    const velocidad = VELOCIDADES_AUDIO[nivel];

    if (velocidad === undefined) {
        return;
    }

    audioTeclado.playbackRate = velocidad;

    intentarReproducirAudio();
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
        elementos.rango.textContent = "Sin actividad";

        elementos.registros.textContent =
            "30.000 registros sintéticos";

        elementos.descripcion.textContent =
            "Escribe para descubrir el descanso promedio " +
            "asociado a distintos niveles de productividad.";

        elementos.progreso.style.width = "0%";
    } else {
        const datos = DATOS[nivel];

        elementos.nivel.textContent = nivel;
        elementos.nivel.style.color = datos.color;

        elementos.sueno.textContent =
            `${datos.horas.toFixed(2)} horas`;

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
    }

    nivelActual = nivel;
    actualizarAudioTeclado(nivel);
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

        audioTeclado.playbackRate =
            VELOCIDADES_AUDIO[nivelEstimado];

        intentarReproducirAudio();
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

    elementos.botonSonido.style.color = sonidoActivo
        ? "#67c7ce"
        : "#a4a9c4";

    if (sonidoActivo) {
        mostrarEstado("Sonido habilitado");
        actualizarAudioTeclado(nivelActual);
    } else {
        detenerAudio();
        mostrarEstado("Sonido desactivado", "#a4a9c4");
    }

    elementos.entrada.focus();
});

audioTeclado.addEventListener("error", () => {
    mostrarEstado(
        "Error: comprueba el archivo teclado.mp3",
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
