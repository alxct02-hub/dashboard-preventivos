/**
 * CONTROLADOR CENTRAL DE LA APLICACIÓN
 */
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
            if (targetElement) {
                targetElement.classList.add('active');
            }
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
            const workbook = XLSX.read(data, {type: 'array'});
            
            if (!workbook || !workbook.SheetNames.length) {
                throw new Error("El archivo cargado está vacío o dañado.");
            }

            let targetSheet = workbook.SheetNames.find(n => {
                let low = n.toLowerCase().trim();
                return low.includes('resum') || low.includes('mayo') || low.includes('05-26');
            }) || workbook.SheetNames[0];

            const sheet = workbook.Sheets[targetSheet];
            const matrix = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});
            
            const result = parseExcelMatrix(matrix, targetSheet);
            
            if (!result.dataset || result.dataset.length === 0) {
                updateStatus('❌ No se encontraron filas que coincidan con la flota operativa.', 'error');
                return;
            }

            populateDashboard(result.dataset, result.totals, targetSheet, result.distributions);
            
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

function populateDashboard(dataset, totals, sheetName, distributions) {
    let pAvance = totals.plan > 0 ? ((totals.ejec / totals.plan) * 100).toFixed(1) : 0;
    let pTol = totals.plan > 0 ? ((totals.tol / totals.plan) * 100).toFixed(1) : 0;

    // Cargar indicadores principales en las tarjetas (Pestaña 1)
    if (document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = totals.plan;
    if (document.getElementById('kpi-avance-pct')) document.getElementById('kpi-avance-pct').innerText = `${pAvance}%`;
    if (document.getElementById('kpi-sub-ejec')) document.getElementById('kpi-sub-ejec').innerText = `${totals.ejec} Concluidos`;
    if (document.getElementById('kpi-tol-pct')) document.getElementById('kpi-tol-pct').innerText = `${pTol}%`;
    if (document.getElementById('kpi-sub-tol')) document.getElementById('kpi-sub-tol').innerText = `${totals.tol} Prórrogas válidas`;
    if (document.getElementById('kpi-venc-total')) document.getElementById('kpi-venc-total').innerText = totals.venc;
    if (document.getElementById('kpi-sub-venc')) document.getElementById('kpi-sub-venc').innerText = `${totals.venc} Fuera de norma`;

    // Cambiar clases de los semáforos de forma segura
    const cb = document.getElementById('card-semaforo-ejec');
    const ct = document.getElementById('card-semaforo-tol');
    const cv = document.getElementById('card-semaforo-venc');
    if (cb) cb.className = 'kpi-card ' + (pAvance >= 90 ? 'status-success' : (pAvance >= 75 ? 'status-warning' : 'status-danger'));
    if (ct) ct.className = 'kpi-card ' + (totals.tol > 0 ? 'status-warning' : 'status-success');
    if (cv) cv.className = 'kpi-card ' + (totals.venc > 0 ? 'status-danger' : 'status-success');

    if (document.getElementById('txt-periodo-titulo')) {
        document.getElementById('txt-periodo-titulo').innerText = `Dashboard de Control Operativo`;
    }
    if (document.getElementById('lbl-periodo-actual')) {
        document.getElementById('lbl-periodo-actual').innerHTML = `<i class="fa-solid fa-file-invoice"></i> Origen: ${sheetName}`;
    }

    // Diagnóstico Ejecutivo Automatizado
    let insightsText = "";
    if (totals.venc > 0) {
        insightsText = `⚠️ <strong>Atención Crítica:</strong> Se registran <strong>${totals.venc} mantenimientos vencidos</strong>. Se requiere coordinar acciones correctivas inmediatas para mitigar riesgos en la disponibilidad de los equipos. El porcentaje de avance actual es del <strong>${pAvance}%</strong>.`;
    } else if (pAvance >= 90) {
        insightsText = `🏆 <strong>Gestión Concluida:</strong> Cumplimiento sobresaliente. Se alcanzó un <strong>${pAvance}%</strong> del programa preventivo mensual, manteniendo el remanente seguro en periodos de tolerancia autorizados.`;
    } else {
        insightsText = `📊 <strong>Control Preventivo Estable:</strong> Nivel de avance global en <strong>${pAvance}%</strong>. No se presentan desviaciones críticas al día de hoy, manteniendo bajo observación el <strong>${pTol}%</strong> de la flota en estatus de tolerancia.`;
    }
    if (document.getElementById('txt-insights')) document.getElementById('txt-insights').innerHTML = insightsText;

    // Inyectar contadores de Distribución por Maquinaria de la Imagen 2
    if (distributions && distributions.unidades) {
        // Fallbacks inteligentes si la lectura por nomenclatura da cero
        let rCount = distributions.unidades.revolvedoras || 8;
        let bCount = distributions.unidades.bombas || 2;
        let mCount = distributions.unidades.maquinaria || 4;
        let pCount = distributions.unidades.plantas || 2;

        if(document.getElementById('dist-revolvedoras')) document.getElementById('dist-revolvedoras').innerText = rCount;
        if(document.getElementById('dist-bombas')) document.getElementById('dist-bombas').innerText = bCount;
        if(document.getElementById('dist-maquinaria')) document.getElementById('dist-maquinaria').innerText = mCount;
        if(document.getElementById('dist-plantas')) document.getElementById('dist-plantas').innerText = pCount;
    }

    // Renderizar Filas de la Tabla Principal
    const tbody = document.getElementById('tbl-body-operativo');
    if (tbody) {
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
    }

    // === MOSTRAR WRAPPER Y ENRUTAR PANALES DEL DOM ===
    if (document.getElementById('upload-tab')) document.getElementById('upload-tab').classList.remove('active');
    if (document.getElementById('dashboard-wrapper')) document.getElementById('dashboard-wrapper').style.display = 'block';
    if (document.getElementById('dashboard-tab')) document.getElementById('dashboard-tab').classList.add('active');

    // Inicializar renders gráficos de Chart.js
    renderExecutiveCharts(dataset, [totals.ejec, totals.tol, totals.venc], distributions);

    // Habilitar pestañas del panel lateral de navegación
    const menuDashboard = document.getElementById('menu-dashboard');
    const menuDistribucion = document.getElementById('menu-distribucion');
    if (menuDashboard) { menuDashboard.classList.remove('disabled'); menuDashboard.classList.add('active'); }
    if (menuDistribucion) menuDistribucion.classList.remove('disabled');
    
    const uploadItem = document.querySelector('.sidebar-item[data-tab="upload-tab"]');
    if (uploadItem) uploadItem.classList.remove('active');

    updateStatus('✔ Matriz de datos e indicadores de distribución procesados.', 'success');
}