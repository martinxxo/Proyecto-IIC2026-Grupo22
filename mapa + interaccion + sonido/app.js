document.addEventListener('DOMContentLoaded', () => {
    const dataPath = 'data/datos1.csv';
    const mapUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

    const vistaMapa = document.getElementById('vista-mapa');
    const vistaPais = document.getElementById('vista-pais');
    const volverMapa = document.getElementById('volver-mapa');
    const controlSonido = document.getElementById('control-sonido');
    const audioTrabajo = document.getElementById('audioTrabajo');
    const nombrePais = document.getElementById('nombre-pais');
    const slider = document.getElementById('sleepSlider');
    const horasTexto = document.getElementById('horasTexto');
    const minHorasTexto = document.getElementById('minHorasTexto');
    const maxHorasTexto = document.getElementById('maxHorasTexto');
    const video = document.getElementById('workerVideo');
    const tareasContenedor = document.getElementById('tareas');

    const svg = d3.select('#map-svg');
    const width = +svg.attr('width');
    const height = +svg.attr('height');
    const tooltip = d3.select('#tooltip');

    const totalTareas = 10;
    const minimoVisual = 3;
    const pasoHoras = 0.5;

    let datos = [];
    let datosPais = [];
    let productividadPorHora = [];
    let productividadPromedioMin = 0;
    let productividadPromedioMax = 0;
    let sonidoActivo = false;

    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    for (let i = 0; i < totalTareas; i++) {
        const tarea = document.createElement('div');
        tarea.classList.add('tarea');
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

        const datosFiltrados = datosPais.filter(d =>
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
    }

    function calcularProporcion(productividad) {
        if (productividadPromedioMax === productividadPromedioMin) {
            return 0;
        }

        return (
            (productividad - productividadPromedioMin) /
            (productividadPromedioMax - productividadPromedioMin)
        );
    }

    function calcularUnidadesVisuales(productividad) {
        const proporcion = calcularProporcion(productividad);

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
        const proporcion = calcularProporcion(productividad);
        const unidadesVisuales = calcularUnidadesVisuales(productividad);
        const tareas = document.querySelectorAll('.tarea');

        tareas.forEach((tarea, indice) => {
            if (indice < unidadesVisuales) {
                tarea.classList.add('completada');
            } else {
                tarea.classList.remove('completada');
            }
        });

        const velocidadVideoMinima = 0.5;
        const velocidadVideoMaxima = 2.0;

        const velocidadVideo =
            velocidadVideoMinima +
            proporcion * (velocidadVideoMaxima - velocidadVideoMinima);

        video.playbackRate = velocidadVideo;

        const velocidadAudioMinima = 0.4;
        const velocidadAudioMaxima = 2.3;

        const velocidadAudio =
            velocidadAudioMinima +
            proporcion * (velocidadAudioMaxima - velocidadAudioMinima);

        audioTrabajo.playbackRate = velocidadAudio;
    }

    function abrirPais(pais) {
        datosPais = datos.filter(d => d.Country === pais);

        if (datosPais.length === 0) {
            return;
        }

        const minHorasDatos = d3.min(datosPais, d => d.Sleep_Hours);
        const maxHorasDatos = d3.max(datosPais, d => d.Sleep_Hours);
        const minHoras = Math.ceil(minHorasDatos / pasoHoras) * pasoHoras;
        const maxHoras = Math.floor(maxHorasDatos / pasoHoras) * pasoHoras;

        slider.min = minHoras;
        slider.max = maxHoras;
        slider.step = pasoHoras;

        minHorasTexto.textContent = formatearHoras(minHoras);
        maxHorasTexto.textContent = formatearHoras(maxHoras);

        calcularPromediosPorHora(minHoras, maxHoras);

        const puntoMedio =
            Math.round(((minHoras + maxHoras) / 2) / pasoHoras) * pasoHoras;

        slider.value = puntoMedio;
        nombrePais.textContent = pais;

        tooltip.classed('hidden', true);
        vistaMapa.classList.remove('activa');
        vistaPais.classList.add('activa');

        actualizarVisualizacion();
        video.play().catch(() => {});
    }

    function regresarMapa() {
        vistaPais.classList.remove('activa');
        vistaMapa.classList.add('activa');
        tooltip.classed('hidden', true);

        audioTrabajo.pause();
        sonidoActivo = false;
        controlSonido.textContent = '🔇';
    }

    controlSonido.addEventListener('click', () => {
        if (sonidoActivo) {
            audioTrabajo.pause();
            sonidoActivo = false;
            controlSonido.textContent = '🔇';
        } else {
            audioTrabajo.play()
                .then(() => {
                    sonidoActivo = true;
                    controlSonido.textContent = '🔊';
                })
                .catch(error => {
                    console.error('No se pudo reproducir el audio:', error);
                });
        }
    });

    volverMapa.addEventListener('click', regresarMapa);
    slider.addEventListener('input', actualizarVisualizacion);

    Promise.all([
        d3.json(mapUrl),
        d3.csv(dataPath)
    ]).then(([world, data]) => {
        datos = data.map(d => ({
            ...d,
            Sleep_Hours: Number(d.Sleep_Hours),
            Productivity_Score: Number(d.Productivity_Score)
        }));

        const countryData = {};

        datos.forEach(d => {
            const country = d.Country;

            if (!countryData[country]) {
                countryData[country] = {
                    count: 0,
                    sleepSum: 0,
                    prodSum: 0
                };
            }

            countryData[country].count += 1;
            countryData[country].sleepSum += d.Sleep_Hours;
            countryData[country].prodSum += d.Productivity_Score;
        });

        Object.keys(countryData).forEach(country => {
            const c = countryData[country];
            c.avgSleep = (c.sleepSum / c.count).toFixed(2);
            c.avgProd = (c.prodSum / c.count).toFixed(2);
        });

        const nameMapping = {
            'United States of America': 'USA',
            'United Kingdom': 'UK'
        };

        const countries = topojson.feature(
            world,
            world.objects.countries
        ).features;

        const colorScale = d3.scaleOrdinal(d3.schemeSet3);
        const g = svg.append('g');

        g.selectAll('path')
            .data(countries)
            .enter()
            .append('path')
            .attr('class', d => {
                let name = d.properties.name;
                name = nameMapping[name] || name;
                return countryData[name] ? 'country has-data' : 'country';
            })
            .style('fill', d => {
                let name = d.properties.name;
                name = nameMapping[name] || name;

                if (countryData[name]) {
                    return colorScale(name);
                }

                return null;
            })
            .attr('d', path)
            .on('mouseenter', function(event, d) {
                let name = d.properties.name;
                name = nameMapping[name] || name;

                const info = countryData[name];

                if (!info) {
                    return;
                }

                d3.select(this).classed('active', true);

                tooltip
                    .classed('hidden', false)
                    .html(`
                        <h3>${name}</h3>
                        <p><strong>Sueño Promedio:</strong> ${info.avgSleep} horas</p>
                        <p><strong>Productividad Promedio:</strong> ${info.avgProd} / 100</p>
                        <p><strong>Total de Trabajadores:</strong> ${info.count}</p>
                    `);

                const [x, y] = d3.pointer(
                    event,
                    d3.select('#visualization-container').node()
                );

                tooltip
                    .style('left', x + 'px')
                    .style('top', y + 'px');
            })
            .on('mousemove', function(event) {
                if (!tooltip.classed('hidden')) {
                    const [x, y] = d3.pointer(
                        event,
                        d3.select('#visualization-container').node()
                    );

                    tooltip
                        .style('left', x + 'px')
                        .style('top', y + 'px');
                }
            })
            .on('mouseleave', function() {
                d3.select(this).classed('active', false);
                tooltip.classed('hidden', true);
            })
            .on('click', function(event, d) {
                let name = d.properties.name;
                name = nameMapping[name] || name;

                if (!countryData[name]) {
                    return;
                }

                abrirPais(name);
            });
    }).catch(error => {
        console.error('Error al cargar los datos o el mapa:', error);
    });
});