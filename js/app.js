document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupFileLoader();
});

// Navegación entre pestañas corporativas
function setupNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            if(this.classList.contains('disabled')) return;
            
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
            
            this.classList.add('active');
            const targetTab = this.getAttribute('data-tab');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Carga e inicialización estructurada de archivos
function setupFileLoader() {
    const zone = document.getElementById('drop-zone');
    const input = document.getElementById('file-input');

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('dragover'); if(e.dataTransfer.files.length) processExcelFile(e.dataTransfer.files[0]); });
    input.addEventListener('change', (e) => { if(e.target.files.length) processExcelFile(e.target.files[0]); });
}

function processExcelFile(file) {
    updateStatus('⌛ Decodificando libro de Excel...', 'success');
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, {type: 'array'});
            
            // Buscar inteligentemente la pestaña de resumen operativo
            let targetSheet = workbook.SheetNames.find(n => {
                let low = n.toLowerCase().trim();
                return low.includes('resum') || low.includes('mayo') || low.includes('05-26');
            }) || workbook.SheetNames[0];

            const sheet = workbook.Sheets[targetSheet];
            const matrix = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});
            
            const result = parseExcelMatrix(matrix, targetSheet);
            populateDashboard(result.dataset, result.totals, targetSheet);
            
        } catch (err) {
            updateStatus('❌ Error: El formato interno del archivo no es admitido o está encriptado.', 'error');
        }
    };
}

function updateStatus(msg, type) {
    const statusBox = document.getElementById('upload-status');
    statusBox.className = `status-message ${type}`;
    statusBox.innerHTML = msg;
    statusBox.style.display = 'block';
}

function populateDashboard(dataset, totals, sheetName) {
    // Calcular porcentajes corporativos
    let pAvance = totals.plan > 0 ? ((totals.ejec / totals.plan) * 100).toFixed(1) : 0;
    let pTol = totals.plan > 0 ? ((totals.tol / totals.plan) * 100).toFixed(1) : 0;

    // Inyectar valores en tarjetas de KPI
    document.getElementById('kpi-total').innerText = totals.plan;
    document.getElementById('kpi-avance-pct').innerText = `${pAvance}%`;
    document.getElementById('kpi-sub-ejec').innerText = `${totals.ejec} Completados de forma óptima`;
    document.getElementById('kpi-tol-pct').innerText = `${pTol}%`;
    document.getElementById('kpi-sub-tol').innerText = `${totals.tol} Unidades bajo resguardo`;
    document.getElementById('kpi-venc-total').innerText = totals.venc;
    document.getElementById('kpi-sub-venc').innerText = `${totals.venc} Retrasos fuera de ventana`;

    // Asignación de Semáforos Corporativos a Tarjetas Principales
    document.getElementById('card-semaforo-ejec').className = 'kpi-card ' + (pAvance >= 90 ? 'status-success' : (pAvance >= 75 ? 'status-warning' : 'status-danger'));
    document.getElementById('card-semaforo-tol').className = 'kpi-card ' + (totals.tol > 0 ? 'status-warning' : 'status-success');
    document.getElementById('card-semaforo-venc').className = 'kpi-card ' + (totals.venc > 0 ? 'status-danger' : 'status-success');

    // Títulos ejecutivos del periodo
    document.getElementById('txt-periodo-titulo').innerText = `Dashboard de Control: Hoja ${sheetName.toUpperCase()}`;
    document.getElementById('lbl-periodo-actual').innerHTML = `<i class="fa-solid fa-calendar-check"></i> Origen: ${sheetName}`;

    // Diagnóstico Directivo Automatizado en Tiempo Real
    let insightsText = "";
    if(totals.venc > 0) {
        insightsText = `⚠️ <strong>Atención Prioritaria:</strong> Se identifican <strong>${totals.venc} mantenimientos críticos vencidos</strong> fuera de ventana. Se sugiere mitigar el riesgo operativo de paros no planificados. El porcentaje de avance actual es del <strong>${pAvance}%</strong>.`;
    } else if (pAvance >= 90) {
        insightsText = `🏆 <strong>Estatus Concluido:</strong> Gestión operativa calificada como excelente. Se completó el <strong>${pAvance}%</strong> del programa preventivo mensual, manteniendo el remanente protegido dentro de los márgenes de tolerancia vigentes.`;
    } else {
        insightsText = `📊 <strong>Control Preventivo Estable:</strong> Nivel de avance en <strong>${pAvance}%</strong>. Sin desviaciones críticas ni unidades vencidas al día de hoy, manteniendo bajo observación el <strong>${pTol}%</strong> de los equipos posicionados en rango de tolerancia autorizada.`;
    }
    document.getElementById('txt-insights').innerHTML = insightsText;

    // Poblar la tabla de auditoría detallada
    const tbody = document.getElementById('tbl-body-operativo');
    tbody.innerHTML = '';
    dataset.forEach(d => {
        let badgeStyle = 'pill-success'; let badgeText = 'Al día';
        if(d.venc > 0) { badgeStyle = 'pill-danger'; badgeText = 'Crítico Vencido'; }
        else if(d.tol > 0) { badgeStyle = 'pill-warning'; badgeText = 'En Tolerancia'; }

        tbody.innerHTML += `
            <tr>
                <td><strong>${d.tipo}</strong></td>
                <td>${d.plan}</td>
                <td style="color: var(--color-success); font-weight:600;">${d.ejec}</td>
                <td style="color: var(--color-warning); font-weight:600;">${d.tol}</td>
                <td style="color: var(--color-danger); font-weight:600;">${d.venc}</td>
                <td style="font-weight:700;">${d.pct}%</td>
                <td><span class="pill ${badgeStyle}">${badgeText}</span></td>
            </tr>
        `;
    });

    // Renderizar Gráficas
    renderExecutiveCharts(dataset, [totals.ejec, totals.tol, totals.venc]);

    // Habilitar y transicionar automáticamente a la pestaña de Vista Ejecutiva
    const menuDashboard = document.getElementById('menu-dashboard');
    menuDashboard.classList.remove('disabled');
    updateStatus('✔ Datos mapeados y analizados correctamente.', 'success');
    
    setTimeout(() => { menuDashboard.click(); }, 800);
}