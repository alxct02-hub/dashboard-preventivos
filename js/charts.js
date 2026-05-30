let chartBarInstance = null;
let chartPieInstance = null;

function renderExecutiveCharts(dataset, totalsArray) {
    const canvasBar = document.getElementById('chartExecutiveBar');
    const canvasPie = document.getElementById('chartExecutivePie');

    // Evita que el script truene si los canvas aún no se pintan en el DOM
    if (!canvasBar || !canvasPie) {
        console.error("Error: No se encontraron los elementos canvas para inicializar los gráficos.");
        return;
    }

    // Asegurar que el array de totales contenga números válidos para Chart.js
    const safeTotals = totalsArray.map(val => isNaN(parseInt(val)) ? 0 : parseInt(val));

    if (chartBarInstance) chartBarInstance.destroy();
    if (chartPieInstance) chartPieInstance.destroy();

    const labels = dataset.map(x => x.tipo);
    const planData = dataset.map(x => x.plan);
    const ejecData = dataset.map(x => x.ejec);

    // 1. Gráfico de Barras Comparativo
    const ctxBar = canvasBar.getContext('2d');
    chartBarInstance = new Chart(ctxBar, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                { label: 'Planificados', data: planData, backgroundColor: '#64748b', borderRadius: 4 },
                { label: 'Ejecutados', data: ejecData, backgroundColor: '#10b981', borderRadius: 4 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top', labels: { font: { family: 'Inter' } } } },
            scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
        }
    });

    // 2. Gráfico de Dona de Distribución
    const ctxPie = canvasPie.getContext('2d');
    chartPieInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Ejecutados', 'En Tolerancia', 'Vencidos'],
            datasets: [{ data: safeTotals, backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { family: 'Inter', weight: 500 } } } },
            cutout: '72%'
        }
    });
}