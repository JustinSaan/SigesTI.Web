/**
 * Tablero de Indicadores y Métricas - SigesTI
 * Las gráficas vienen dibujadas en SVG desde el servidor (GraficasSvg.cs);
 * sus colores de texto cambian solos con el aspecto oscuro/claro y al imprimir (indicadores.css).
 */

// Copia las observaciones al recuadro del reporte; si no hay, el panel no sale en el reporte
function prepararObservaciones() {
    const texto = document.getElementById('txtObservaciones').value.trim();
    document.getElementById('printObservacionesText').innerText = texto;
    document.getElementById('panelObservaciones').classList.toggle('d-print-none', texto === '');
}

// Al imprimir pone el tablero en fondo blanco con textos oscuros
// (El botón Descargar PDF no usa esto: el PDF se arma en el servidor, en IndicadoresPdf.cs)
function modoImpresion(activo) {
    document.getElementById('seccionImpresion').classList.toggle('modo-impresion', activo);
}

function imprimirReporte() {
    prepararObservaciones();
    imprimirConNombre('ReporteIndicadoresYMetricas');
}

window.addEventListener('beforeprint', () => modoImpresion(true));
window.addEventListener('afterprint', () => modoImpresion(false));

// Los filtros se aplican solos al cambiar una fecha o el origen (sin botón Aplicar)
function inicializarFiltrosAutomaticos() {
    const form = document.getElementById('formFiltros');
    if (!form) return;

    form.addEventListener('change', () => {
        // Espera a que las dos fechas estén completas
        if (form.FechaInicio.value && form.FechaFin.value) form.submit();
    });
}

document.addEventListener('DOMContentLoaded', inicializarFiltrosAutomaticos);
