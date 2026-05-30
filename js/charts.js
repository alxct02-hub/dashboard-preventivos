/**
 * GESTOR CENTRALIZADO DE RENDERS GRÁFICOS (CHART.JS)
 */
let chartBarInstance = null;
let chartPieInstance = null;
let chartUbicInstance = null;
let chartServInstance = null;

function renderExecutiveCharts(dataset, totalsArray, distributions) {
    const canvasBar = document.getElementById('chartExecutiveBar');
    const canvasPie = document.getElementById('chartExecutivePie');
    const canvasUbic = document.getElementById('chartUbicaciones');
    const canvasServ = document.getElementById('chartServicios');

    if (!canvasBar || !canvasPie) return;

    const safeTotals = totalsArray.map(val => isNaN(parseInt(val)) ? 0 : parseInt(val));

    // 1. GRÁFICA COMPARATIVA PRINCIPAL (Pestaña Vista Ejecutiva)
    if (chartBarInstance) chartBarInstance.destroy();
    chartBarInstance = new Chart(canvasBar.getContext('2d'), {
        type: 'bar',
        data: {
            labels: dataset.map(x => x.tipo),
            datasets: [
                { label: 'Planificados', data: dataset.map(x => x.plan), backgroundColor: '#64748b', borderRadius: 4 },
                { label: 'Ejecutados', data: dataset.map(x => x.ejec), backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });

    // 2. GRÁFICA DE DONA DE CUMPLIMIENTO GLOBAL (Pestaña Vista Ejecutiva)
    if (chartPieInstance) chartPieInstance.destroy();
    chartPieInstance = new Chart(canvasPie.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Ejecutados', 'En Tolerancia', 'Vencidos'],
            datasets: [{ data: safeTotals, backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } }
        }
    });

    // VALIDACIÓN DE DATOS PARA LAS GRÁFICAS DE DISTRIBUCIÓN SECUNDARIAS
    if (!distributions) return;

    // 3. GRÁFICA HORIZONTAL POR PLANTA / UBICACIÓN (Pestaña Distribución)
    if (canvasUbic) {
        if (chartUbicInstance) chartUbicInstance.destroy();
        const ubicLabels = Object.keys(distributions.ubicaciones);
        const ubicData = Object.values(distributions.ubicaciones);

        chartUbicInstance = new Chart(canvasUbic.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ubicLabels,
                datasets: [{
                    label: 'Cantidad de Mantenimientos',
                    data: ubicData,
                    backgroundColor: '#1e3a8a',
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y', // Hace que sea de barras horizontales de forma limpia
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
            }
        });
    }

    // 4. GRÁFICA MULTICOLOR POR TIPO DE SERVICIO (Pestaña Distribución)
    if (canvasServ) {
        if (chartServInstance) chartServInstance.destroy();
        const servLabels = Object.keys(distributions.servicios);
        const servData = Object.values(distributions.servicios);

        chartServInstance = new Chart(canvasServ.getContext('2d'), {
            type: 'pie',
            data: {
                labels: servLabels,
                datasets: [{
                    data: servData,
                    backgroundColor: ['#0284c7', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#6366f1', '#14b8a6']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 12 } } }
            }
        });
    }
}