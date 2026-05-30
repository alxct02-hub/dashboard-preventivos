let chartBarInstance = null;
let chartPieInstance = null;

function renderExecutiveCharts(dataset, totalsArray) {
    if(chartBarInstance) chartBarInstance.destroy();
    if(chartPieInstance) chartPieInstance.destroy();

    const labels = dataset.map(x => x.tipo);
    const planData = dataset.map(x => x.plan);
    const ejecData = dataset.map(x => x.ejec);

    // 1. Gráfica de Cumplimiento por Categorías
    const ctxBar = document.getElementById('chartExecutiveBar').getContext('2d');
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

    // 2. Gráfica de Estatus General de Distribución del Mes
    const ctxPie = document.getElementById('chartExecutivePie').getContext('2d');
    chartPieInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Ejecutados', 'En Tolerancia', 'Vencidos'],
            datasets: [{ data: totalsArray, backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderWidth: 2 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { padding: 15, font: { family: 'Inter', weight: 500 } } } },
            cutout: '72%'
        }
    });
}