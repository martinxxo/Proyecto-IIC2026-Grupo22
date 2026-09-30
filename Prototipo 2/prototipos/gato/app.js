const slider = document.getElementById("sleepSlider");
const horasTexto = document.getElementById("horasTexto");
const minHorasTexto = document.getElementById("minHorasTexto");
const maxHorasTexto = document.getElementById("maxHorasTexto");
const video = document.getElementById("workerVideo");
const tareasContenedor = document.getElementById("tareas");

const totalTareas = 10;
const minimoVisual = 3;
const pasoHoras = 0.5;
let datos = [];
let productividadPorHora = [];
let productividadPromedioMin = 0;
let productividadPromedioMax = 0;

for (let i = 0; i < totalTareas; i++) {
    const tarea = document.createElement("div");
    tarea.classList.add("tarea");
    tareasContenedor.appendChild(tarea);
}

function formatearHoras(valor) {
    const horas = Math.floor(valor);
    const minutos = Math.round((valor - horas) * 60);

    if (minutos === 0) {
        return `${horas} horas`;
    }

    return `${horas} horas y ${minutos} minutos`;
}

function calcularProductividad(horasSeleccionadas) {
    const mitadIntervalo = pasoHoras / 2;
    const datosFiltrados = datos.filter(d =>
        d.Sleep_Hours >= horasSeleccionadas - mitadIntervalo &&
        d.Sleep_Hours < horasSeleccionadas + mitadIntervalo
    );

    if (datosFiltrados.length === 0) {
        return null;
    }

    return d3.mean(datosFiltrados, d => d.Productivity_Score);
}

function calcularPromediosPorHora(minHoras, maxHoras) {
    productividadPorHora = [];

    for (let horas = minHoras; horas <= maxHoras + 0.001; horas += pasoHoras) {
        const horasRedondeadas = Math.round(horas * 10) / 10;
        const productividad = calcularProductividad(horasRedondeadas);

        if (productividad !== null) {
            productividadPorHora.push({
                horas: horasRedondeadas,
                productividad: productividad
            });
        }
    }

    productividadPromedioMin = d3.min(productividadPorHora, d => d.productividad);
    productividadPromedioMax = d3.max(productividadPorHora, d => d.productividad);

    console.table(
        productividadPorHora.map(d => ({
            Horas: d.horas,
            Productividad: Number(d.productividad.toFixed(2))
        }))
    );
}

function calcularUnidadesVisuales(productividad) {
    if (productividadPromedioMax === productividadPromedioMin) {
        return minimoVisual;
    }

    const proporcion =
        (productividad - productividadPromedioMin) /
        (productividadPromedioMax - productividadPromedioMin);

    const unidades =
        minimoVisual +
        proporcion * (totalTareas - minimoVisual);

    return Math.round(unidades);
}

function actualizarVisualizacion() {
    const horas = Number(slider.value);
    horasTexto.textContent = formatearHoras(horas);

    const registro = productividadPorHora.find(
        d => Math.abs(d.horas - horas) < 0.01
    );

    if (!registro) {
        return;
    }

    const productividad = registro.productividad;
    const unidadesVisuales = calcularUnidadesVisuales(productividad);
    const tareas = document.querySelectorAll(".tarea");

    tareas.forEach((tarea, indice) => {
        if (indice < unidadesVisuales) {
            tarea.classList.add("completada");
        } else {
            tarea.classList.remove("completada");
        }
    });

    const velocidadMinima = 0.5;
    const velocidadMaxima = 2.0;

    let proporcion = 0;

    if (productividadPromedioMax !== productividadPromedioMin) {
        proporcion =
            (productividad - productividadPromedioMin) /
            (productividadPromedioMax - productividadPromedioMin);
    }

    const velocidad =
        velocidadMinima +
        proporcion * (velocidadMaxima - velocidadMinima);

    video.playbackRate = velocidad;
}

d3.csv("../../data/Work Productivity.csv")
.then(data => {
    datos = data.map(d => ({
        ...d,
        Sleep_Hours: Number(d.Sleep_Hours),
        Productivity_Score: Number(d.Productivity_Score)
    }));

    const minHoras = d3.min(datos, d => d.Sleep_Hours);
    const maxHoras = d3.max(datos, d => d.Sleep_Hours);

    slider.min = minHoras;
    slider.max = maxHoras;
    slider.step = pasoHoras;

    minHorasTexto.textContent = formatearHoras(minHoras);
    maxHorasTexto.textContent = formatearHoras(maxHoras);

    calcularPromediosPorHora(minHoras, maxHoras);

    const puntoMedio =
        Math.round(((minHoras + maxHoras) / 2) / pasoHoras) * pasoHoras;

    slider.value = puntoMedio;
    slider.disabled = false;
    slider.addEventListener("input", actualizarVisualizacion);

    actualizarVisualizacion();
})
.catch(error => {
    console.error("Error cargando el CSV:", error);
    horasTexto.textContent = "Error cargando los datos";
});