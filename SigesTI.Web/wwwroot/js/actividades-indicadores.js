/**
 * Lógica del Tablero de Indicadores y Métricas - SigesTI
 */

let chartSistemas, chartRequerimientos, chartEscalaciones, chartCanalEntrada;

function toggleObservaciones() {
    const chk = document.getElementById('chkHabilitarObservaciones');
    const panel = document.getElementById('panelObservaciones');
    if (chk && panel) {
        panel.style.display = chk.checked ? 'block' : 'none';
    }
}

function imprimirReporte() {
    const txt = document.getElementById('txtObservaciones')?.value || "";
    const printDiv = document.getElementById('printObservacionesText');
    
    if (printDiv) {
        if (txt.trim() !== "") {
            printDiv.innerText = txt;
            printDiv.classList.remove('d-none');
        } else {
            printDiv.classList.add('d-none');
        }
    }

    window.print();
}

// --------------------------------------------------------------------------
// CAMBIO DINÁMICO DE COLORES PARA IMPRESIÓN SINO AFECTAR PANTALLA
// --------------------------------------------------------------------------
function aplicarColoresEspeciales(modoImpresion) {
    const colorTextoLeyenda = modoImpresion ? '#0f172a' : '#ffffff';
    const colorTextoEjes = modoImpresion ? '#1e293b' : '#94a3b8';
    const colorLineasGrid = modoImpresion ? 'rgba(0, 0, 0, 0.1)' : 'rgba(148, 163, 184, 0.15)';

    // 1. Chart Sistemas
    if (chartSistemas) {
        chartSistemas.options.plugins.legend.labels.color = colorTextoLeyenda;
        chartSistemas.update('none');
    }

    // 2. Chart Requerimientos
    if (chartRequerimientos) {
        chartRequerimientos.options.scales.x.ticks.color = colorTextoEjes;
        chartRequerimientos.options.scales.y.ticks.color = colorTextoLeyenda;
        chartRequerimientos.options.scales.x.grid.color = colorLineasGrid;
        chartRequerimientos.update('none');
    }

    // 3. Chart Escalaciones
    if (chartEscalaciones) {
        chartEscalaciones.options.plugins.legend.labels.color = colorTextoLeyenda;
        chartEscalaciones.update('none');
    }

    // 4. Chart Canal Entrada
    if (chartCanalEntrada) {
        chartCanalEntrada.options.scales.x.ticks.color = colorTextoLeyenda;
        chartCanalEntrada.options.scales.y.ticks.color = colorTextoEjes;
        chartCanalEntrada.options.scales.y.grid.color = colorLineasGrid;
        chartCanalEntrada.update('none');
    }
}

// Eventos nativos del navegador al mandar a imprimir o cancelar
window.addEventListener('beforeprint', () => aplicarColoresEspeciales(true));
window.addEventListener('afterprint', () => aplicarColoresEspeciales(false));


document.addEventListener("DOMContentLoaded", function () {
    if (typeof ChartDataLabels !== 'undefined') {
        Chart.register(ChartDataLabels);
    }

    Chart.defaults.font.family = 'Segoe UI, sans-serif';

    // 1. Gráfica de Sistemas (Pantalla: Texto Blanco Bright)
    const elSistemas = document.getElementById('chartSistemas');
    if (elSistemas) {
        chartSistemas = new Chart(elSistemas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['DIA', 'DIAWEB', 'MED', 'SITA', 'VUCEM', 'PREMIUM', 'COA', 'ADMIN'],
                datasets: [{
                    data: [5, 6, 4, 10, 0, 0, 0, 4],
                    backgroundColor: ['#2563eb', '#38bdf8', '#64748b', '#f97316', '#1e3a8a', '#4ade80', '#16a34a', '#eab308'],
                    borderColor: '#0f172a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { 
                            color: '#ffffff', // Blanco puro para pantalla
                            padding: 6, 
                            font: { size: 10, weight: 'bold' } 
                        } 
                    },
                    datalabels: {
                        color: '#ffffff',
                        font: { weight: 'bold', size: 10 },
                        formatter: (value, ctx) => {
                            if (value === 0) return null;
                            let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            return ((value * 100) / sum).toFixed(1) + "%";
                        }
                    }
                },
                cutout: '50%'
            }
        });
    }

    // 2. Gráfica Tipo de Requerimiento
    const elReq = document.getElementById('chartRequerimientos');
    if (elReq) {
        chartRequerimientos = new Chart(elReq.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Servicios', 'Incidencias', 'Mejoras', 'Ajustes'],
                datasets: [{
                    data: [12, 6, 4, 2],
                    backgroundColor: ['rgba(59, 130, 246, 0.85)', 'rgba(239, 68, 68, 0.85)', 'rgba(16, 185, 129, 0.85)', 'rgba(245, 158, 11, 0.85)'],
                    borderColor: ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'],
                    borderWidth: 1,
                    borderRadius: 6
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'end', 
                        align: 'end', 
                        color: '#38bdf8', 
                        font: { weight: 'bold', size: 10 },
                        formatter: (value) => `${value} (${((value / 24) * 100).toFixed(1)}%)`
                    }
                },
                scales: {
                    x: { 
                        grid: { color: 'rgba(148, 163, 184, 0.15)' }, 
                        ticks: { color: '#94a3b8', font: { weight: 'bold' } }, 
                        suggestedMax: 15 
                    },
                    y: { 
                        grid: { display: false }, 
                        ticks: { color: '#ffffff', font: { size: 11, weight: 'bold' } } 
                    }
                }
            }
        });
    }

    // 3. Gráfica Tickets Escalados
    const elEsc = document.getElementById('chartEscalaciones');
    if (elEsc) {
        chartEscalaciones = new Chart(elEsc.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Sin Escalación', 'Desarrollo', 'Consultoría', 'Cobranza', 'Ventas'],
                datasets: [{
                    data: [16, 4, 2, 1, 1],
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'],
                    borderColor: '#0f172a',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { 
                        position: 'right', 
                        labels: { color: '#ffffff', font: { size: 9, weight: 'bold' }, padding: 6 } 
                    },
                    datalabels: {
                        color: '#ffffff', 
                        font: { weight: 'bold', size: 10 },
                        formatter: (value, ctx) => {
                            if (value === 0) return null;
                            let sum = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            return ((value * 100) / sum).toFixed(1) + "%";
                        }
                    }
                },
                cutout: '50%'
            }
        });
    }

    // 4. Gráfica Canal de Entrada
    const elCanal = document.getElementById('chartCanalEntrada');
    if (elCanal) {
        chartCanalEntrada = new Chart(elCanal.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Llamada Telefónica', 'Correo Electrónico'],
                datasets: [{
                    data: [14, 10],
                    backgroundColor: ['rgba(2, 132, 199, 0.85)', 'rgba(16, 185, 129, 0.85)'],
                    borderColor: ['#38bdf8', '#4ade80'],
                    borderWidth: 1,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                plugins: {
                    legend: { display: false },
                    datalabels: {
                        anchor: 'center', 
                        align: 'center', 
                        color: '#ffffff', 
                        font: { weight: 'bold', size: 11 },
                        formatter: (value) => `${value} (${((value / 24) * 100).toFixed(1)}%)`
                    }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#ffffff', font: { weight: 'bold', size: 10 } } },
                    y: { grid: { color: 'rgba(148, 163, 184, 0.15)' }, ticks: { color: '#94a3b8' }, suggestedMax: 16 }
                }
            }
        });
    }
});