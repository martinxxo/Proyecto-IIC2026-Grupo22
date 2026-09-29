document.addEventListener('DOMContentLoaded', () => {
    const dataPath = 'code/data/Work Productivity.csv';
    // Mapa GeoJSON/TopoJSON de los países del mundo
    const mapUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

    const svg = d3.select("#map-svg");
    const width = +svg.attr("width");
    const height = +svg.attr("height");
    const tooltip = d3.select("#tooltip");

    // Proyección cartográfica para el mapa 2D (Mercator o NaturalEarth)
    const projection = d3.geoNaturalEarth1()
        .scale(160)
        .translate([width / 2, height / 2]);

    const path = d3.geoPath().projection(projection);

    // Cargar mapa del mundo y datos CSV al mismo tiempo
    Promise.all([
        d3.json(mapUrl),
        d3.csv(dataPath)
    ]).then(([world, data]) => {
        
        // 1. Procesar los datos: calcular promedios por país
        const countryData = {};
        
        data.forEach(d => {
            const country = d.Country;
            if (!countryData[country]) {
                countryData[country] = {
                    count: 0,
                    sleepSum: 0,
                    prodSum: 0
                };
            }
            countryData[country].count += 1;
            countryData[country].sleepSum += parseFloat(d.Sleep_Hours);
            countryData[country].prodSum += parseFloat(d.Productivity_Score);
        });

        // Calcular promedios finales
        Object.keys(countryData).forEach(country => {
            const c = countryData[country];
            c.avgSleep = (c.sleepSum / c.count).toFixed(2);
            c.avgProd = (c.prodSum / c.count).toFixed(2);
        });

        // 2. Mapear nombres del mapa a los nombres de tu dataset
        // Por ejemplo, el mapa llama a EEUU "United States of America" pero tu dataset puede llamarlo "USA"
        const nameMapping = {
            "United States of America": "USA",
            "United Kingdom": "UK"
            // Se pueden agregar más si hay diferencias de nombres (ej: "South Korea")
        };

        const countries = topojson.feature(world, world.objects.countries).features;

        // Escala de colores categórica para asignar un color distinto a cada país
        // Usamos una paleta integrada de D3 que tiene colores variados y amigables
        const colorScale = d3.scaleOrdinal(d3.schemeSet3);

        // 3. Dibujar el mapa
        const g = svg.append("g");

        g.selectAll("path")
            .data(countries)
            .enter().append("path")
            .attr("class", d => {
                let name = d.properties.name;
                name = nameMapping[name] || name;
                return countryData[name] ? "country has-data" : "country";
            })
            .style("fill", d => {
                let name = d.properties.name;
                name = nameMapping[name] || name;
                if (countryData[name]) {
                    return colorScale(name); // Asigna un color único por nombre de país
                }
                return null; // CSS default
            })
            .attr("d", path)
            // 4. Configurar interactividad (Mouse Eventos)
            .on("mousedown", function(event, d) {
                let name = d.properties.name;
                name = nameMapping[name] || name;
                const info = countryData[name];

                // Solo mostrar si el país tiene datos
                if (info) {
                    d3.select(this).classed("active", true); // Iluminar país
                    
                    // Mostrar ventanita temporal
                    tooltip.classed("hidden", false)
                        .html(`
                            <h3>${name}</h3>
                            <p><strong>Sueño Promedio:</strong> ${info.avgSleep} horas</p>
                            <p><strong>Productividad Promedio:</strong> ${info.avgProd} / 100</p>
                            <p><strong>Total de Trabajadores:</strong> ${info.count}</p>
                        `);
                        
                    // Posicionar ventanita en el mouse relative a la caja del mapa
                    const [x, y] = d3.pointer(event, d3.select("#visualization-container").node());
                    tooltip
                        .style("left", x + "px")
                        .style("top", y + "px");
                }
            })
            .on("mousemove", function(event) {
                // Si la ventanita está visible, que siga al mouse
                if (!tooltip.classed("hidden")) {
                    const [x, y] = d3.pointer(event, d3.select("#visualization-container").node());
                    tooltip
                        .style("left", x + "px")
                        .style("top", y + "px");
                }
            })
            .on("mouseup", function() {
                // Al soltar el clic, esconder la ventanita y apagar el color activo
                d3.select(this).classed("active", false);
                tooltip.classed("hidden", true);
            })
            .on("mouseleave", function() {
                // Si el mouse sale del país antes de soltar el clic, también esconder
                d3.select(this).classed("active", false);
                tooltip.classed("hidden", true);
            });

    }).catch(error => {
        console.error("Error al cargar los datos o el mapa:", error);
        d3.select("#visualization-container").html(`
            <div style="padding: 2rem; color: #e74c3c; text-align: center;">
                <h3>Error al cargar los datos o el mapa</h3>
                <p>Asegúrate de estar usando un <strong>servidor local</strong> (como Live Server en VSCode o python -m http.server).</p>
                <p>Si solo hiciste doble clic en el archivo <code>index.html</code>, el navegador bloqueará la carga por motivos de seguridad.</p>
                <p style="font-size: 0.8rem; color: #666;">Detalle técnico: ${error.message}</p>
            </div>
        `);
    });

    // Evento del botón para el futuro
    document.getElementById('play-sonification').addEventListener('click', () => {
        alert("La funcionalidad de sonificación se implementará más adelante.");
    });
});
