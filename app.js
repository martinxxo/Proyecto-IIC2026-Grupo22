// Configuración inicial de d3.js y carga de datos
document.addEventListener('DOMContentLoaded', () => {
    
    // Ruta al dataset (esto asume que se servirá correctamente en GitHub Pages)
    const dataPath = 'code/data/Work Productivity.csv';

    // Cargar los datos usando D3
    d3.csv(dataPath).then(data => {
        console.log("Datos cargados correctamente:", data);
        
        // Aquí puedes inicializar tu visualización
        const container = d3.select("#visualization-container");
        container.html(`<p>Datos cargados con éxito. Total de registros: ${data.length}</p>`);
        
    }).catch(error => {
        console.error("Error al cargar los datos:", error);
        d3.select("#visualization-container").html(`<p style="color:red;">Error al cargar los datos. Verifica la ruta o el formato del archivo.</p>`);
    });

    // Configurar botón de sonificación (placeholder)
    document.getElementById('play-sonification').addEventListener('click', () => {
        alert("La funcionalidad de sonificación se implementará más adelante.");
    });
});
