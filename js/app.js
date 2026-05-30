document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupFileLoader();
});

function setupNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            if (this.classList.contains('disabled')) return;
            
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
            
            this.classList.add('active');
            const targetTab = this.getAttribute('data-tab');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) targetElement.classList.add('active');
        });
    });
}

function setupFileLoader() {
    const zone = document.getElementById('drop-zone');
    const input = document.getElementById('file-input');

    if (!zone || !input) return;

    zone.addEventListener('click', () => input.click());
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        zone.classList.remove('dragover'); 
        if (e.dataTransfer.files.length) processExcelFile(e.dataTransfer.files[0]); 
    });
    input.addEventListener('change', (e) => { 
        if (e.target.files.length) processExcelFile(e.target.files[0]); 
    });
}

function processExcelFile(file) {
    updateStatus('⌛ Analizando estructura interna del libro...', 'success');
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // Lectura cruda tolerante
            const workbook = XLSX.read(data, {type: 'array'});
            
            if (!workbook || !workbook.SheetNames.length) {
                throw new Error("El archivo de Excel parece estar vacío.");
            }

            // Estrategia de búsqueda flexible de hojas
            let targetSheet = workbook.SheetNames.find(n => {
                let low = n.toLowerCase().trim();
                return low.includes('resum') || low.includes('mayo') || low.includes('05-26');
            }) || workbook.SheetNames[0];

            const sheet = workbook.Sheets[targetSheet];
            const matrix = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});
            
            const result = parseExcelMatrix(matrix, targetSheet);
            
            if (!result.dataset || result.dataset.length === 0) {
                updateStatus('❌ No se encontraron filas que coincidan con los equipos de la flota en la pestaña actual.', 'error');
                return;
            }

            populateDashboard(result.dataset, result.totals, targetSheet);
            
        } catch (err) {
            console.error(err);
            updateStatus('❌ <strong>Error crítico:</strong> ' + err.message, 'error');
        }
    };
}

function updateStatus(msg, type) {
    const statusBox = document.getElementById('upload-status');
    if (statusBox) {
        statusBox.className = `status-message ${type}`;
        statusBox.innerHTML = msg;
        statusBox.style.display = 'block';
    }
}

function populateDashboard(dataset, totals, sheetName) {
    let pAvance = totals.plan > 0 ? ((totals.ejec / totals.plan) * 100).toFixed(1) : 0;
    let pTol = totals.plan > 0 ? ((totals.tol / totals.plan) * 100).toFixed(1) : 0;

    // Poblar las tarjetas analíticas de KPI
    document.getElementById('kpi-total').innerText = totals.plan;
    document.getElementById('kpi-avance-pct').innerText = `${pAvance}%`;
    document.getElementById('kpi-sub-ejec').innerText = `${totals.ejec} Concluidos`;
    document.getElementById('kpi-tol-pct').innerText = `${pTol}%`;
    document.getElementById('kpi-sub-tol').innerText = `${totals.tol} Prórrogas válidas`;
    document.getElementById('kpi-venc-total').innerText = totals.venc;
    document.getElementById('kpi-sub-venc').innerText = `${totals.venc} Fuera de norma`;

    // Cambiar clases de los semáforos
    document.getElementById('card-semaforo-ejec').className = 'kpi-card ' + (pAvance >= 90 ? 'status-success' : (pAvance >= 75 ? 'status-warning' : 'status-danger'));
    document.getElementById('card-semaforo-tol').className = 'kpi-card ' + (totals.tol > 0 ? 'status-warning' : 'status-success');
    document.getElementById('card-semaforo-venc').className = 'kpi-card ' + (totals.venc > 0 ? 'status-danger' : 'status-success');

    document.getElementById('txt-periodo-titulo').innerText = `Dashboard Directivo: Hoja ${sheetName.toUpperCase()}`;
    document.getElementById('lbl-periodo-actual').innerHTML = `<i class="fa-solid fa-file-invoice"></i> Origen: ${sheetName}`;

    // Construcción del diagnóstico dinámico
    let insightsText = "";
    if (totals.venc > 0) {
        insightsText = `⚠️ <strong>Atención Crítica:</strong> Se registran <strong>${totals.venc} mantenimientos vencidos</strong>. Se requiere coordinar acciones correctivas inmediatas para mitigar riesgos en la disponibilidad de los equipos. El porcentaje de avance actual es del <strong>${pAvance}%</strong>.`;
    } else if (pAvance >= 90) {
        insightsText = `🏆 <strong>Gestión Concluida:</strong> Cumplimiento sobresaliente. Se alcanzó un <strong>${pAvance}%</strong> del programa preventivo mensual, manteniendo el remanente seguro en periodos de tolerancia autorizados.`;
    } else {
        insightsText = `📊 <strong>Control Preventivo Estable:</strong> Nivel de avance global en <strong>${pAvance}%</strong>. No se presentan desviaciones críticas al día de hoy, manteniendo bajo observación el <strong>${pTol}%</strong> de la flota en estatus de tolerancia.`;
    }
    document.getElementById('txt-insights').innerHTML = insightsText;

    // Generar las filas de la tabla de control corporativo
    const tbody = document.getElementById('tbl-body-operativo');
    tbody.innerHTML = '';
    dataset.forEach(d => {
        let badgeStyle = 'pill-success'; let badgeText = 'Al día';
        if (d.venc > 0) { badgeStyle = 'pill-danger'; badgeText = 'Crítico Vencido'; }
        else if (d.tol > 0) { badgeStyle = 'pill-warning'; badgeText = 'En Tolerancia'; }

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

    // PASO CLAVE: Hacer visible el contenedor del dashboard ANTES de generar los gráficos
    document.getElementById('view-upload').classList.remove('active');
    document.getElementById('dashboard-wrapper').style.display = 'block';
    document.getElementById('dashboard-tab').classList.add('active');

    // Ahora que el DOM está expuesto y visible, inicializamos Chart.js de forma segura
    renderExecutiveCharts(dataset, [totals.ejec, totals.tol, totals.venc]);

    // Habilitar la interacción con el menú lateral
    const menuDashboard = document.getElementById('menu-dashboard');
    menuDashboard.classList.remove('disabled');
    menuDashboard.classList.add('active');
    
    // Desactivar el foco visual de la pestaña de carga en el menú lateral
    document.querySelector('.sidebar-item[data-tab="upload-tab"]').classList.remove('active');

    updateStatus('✔ Matriz de datos procesada con éxito.', 'success');
}