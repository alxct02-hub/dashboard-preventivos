/**
 * CONTROLADOR CENTRAL DEL DASHBOARD
 * Administra la navegación, carga de archivos y distribución de métricas.
 */

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    setupFileLoader();
});

/**
 * 1. GESTIÓN DE NAVEGACIÓN
 * Controla el intercambio de pestañas en el menú lateral corporativo.
 */
function setupNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', function() {
            // Si la pestaña está deshabilitada (antes de cargar el Excel), no hacer nada
            if (this.classList.contains('disabled')) return;
            
            // Remover estado activo de todos los botones y secciones
            document.querySelectorAll('.sidebar-item').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab-view').forEach(el => el.classList.remove('active'));
            
            // Activar la pestaña seleccionada
            this.classList.add('active');
            const targetTab = this.getAttribute('data-tab');
            const targetElement = document.getElementById(targetTab);
            if (targetElement) {
                targetElement.classList.add('active');
            }
        });
    });
}

/**
 * 2. CONTROLADOR DE CARGA DE ARCHIVOS
 * Configura los eventos de clic y arrastre (Drag & Drop) en la zona de carga.
 */
function setupFileLoader() {
    const zone = document.getElementById('drop-zone');
    const input = document.getElementById('file-input');

    if (!zone || !input) return;

    // Abrir selector de archivos al hacer clic en la zona
    zone.addEventListener('click', () => input.click());

    // Efecto visual al arrastrar el archivo sobre la zona
    zone.addEventListener('dragover', (e) => { 
        e.preventDefault(); 
        zone.classList.add('dragover'); 
    });
    
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    
    // Procesar archivo al soltarlo
    zone.addEventListener('drop', (e) => { 
        e.preventDefault(); 
        zone.classList.remove('dragover'); 
        if (e.dataTransfer.files.length) {
            processExcelFile(e.dataTransfer.files[0]);
        }
    });

    // Procesar archivo al seleccionarlo tradicionalmente
    input.addEventListener('change', (e) => { 
        if (e.target.files.length) {
            processExcelFile(e.target.files[0]);
        }
    });
}

/**
 * 3. PROCESAMIENTO BINARIO DEL EXCEL
 * Lee el libro de trabajo y busca la pestaña del mes correspondiente.
 */
function processExcelFile(file) {
    updateStatus('⌛ Analizando estructura interna del libro...', 'success');
    const reader = new FileReader();
    reader.readAsArrayBuffer(file);
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            // Lectura tolerante de hojas mediante SheetJS
            const workbook = XLSX.read(data, {type: 'array'});
            
            if (!workbook || !workbook.SheetNames.length) {
                throw new Error("El archivo de Excel parece estar vacío o dañado.");
            }

            // Estrategia de búsqueda flexible para hallar la pestaña del periodo
            let targetSheet = workbook.SheetNames.find(n => {
                let low = n.toLowerCase().trim();
                return low.includes('resum') || low.includes('mayo') || low.includes('05-26');
            }) || workbook.SheetNames[0];

            const sheet = workbook.Sheets[targetSheet];
            const matrix = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: ""});
            
            // Llamada al motor extractor en excelParser.js
            const result = parseExcelMatrix(matrix, targetSheet);
            
            if (!result.dataset || result.dataset.length === 0) {
                updateStatus('❌ No se localizaron filas de control operativo válidas en la pestaña analizada.', 'error');
                return;
            }

            // Poblar la interfaz con los resultados obtenidos
            populateDashboard(result.dataset, result.totals, targetSheet);
            
        } catch (err) {
            console.error("Error en lectura:", err);
            updateStatus('❌ <strong>Error crítico:</strong> ' + err.message, 'error');
        }
    };
}

/**
 * 4. MENSAJES DE ESTADO DE CARGA
 * Muestra alertas dinámicas de color sobre el éxito o fallo de la importación.
 */
function updateStatus(msg, type) {
    const statusBox = document.getElementById('upload-status');
    if (statusBox) {
        statusBox.className = `status-message ${type}`;
        statusBox.innerHTML = msg;
        statusBox.style.display = 'block';
    }
}

/**
 * 5. DESPLIEGUE INTEGRAL DEL DASHBOARD
 * Distribuye métricas, genera textos analíticos y activa gráficos sin romper la pantalla.
 */
function populateDashboard(dataset, totals, sheetName) {
    // Cálculo seguro de tasas de eficiencia y márgenes de prórroga
    let pAvance = totals.plan > 0 ? ((totals.ejec / totals.plan) * 100).toFixed(1) : 0;
    let pTol = totals.plan > 0 ? ((totals.tol / totals.plan) * 100).toFixed(1) : 0;

    // Inyección de valores en tarjetas KPI con validación de existencia de elementos (Prevención Null)
    if (document.getElementById('kpi-total')) document.getElementById('kpi-total').innerText = totals.plan;
    if (document.getElementById('kpi-avance-pct')) document.getElementById('kpi-avance-pct').innerText = `${pAvance}%`;
    if (document.getElementById('kpi-sub-ejec')) document.getElementById('kpi-sub-ejec').innerText = `${totals.ejec} Concluidos`;
    if (document.getElementById('kpi-tol-pct')) document.getElementById('kpi-tol-pct').innerText = `${pTol}%`;
    if (document.getElementById('kpi-sub-tol')) document.getElementById('kpi-sub-tol').innerText = `${totals.tol} Prórrogas válidas`;
    if (document.getElementById('kpi-venc-total')) document.getElementById('kpi-venc-total').innerText = totals.venc;
    if (document.getElementById('kpi-sub-venc')) document.getElementById('kpi-sub-venc').innerText = `${totals.venc} Fuera de norma`;

    // Asignación controlada de Semáforos Visuales a las tarjetas
    const cb = document.getElementById('card-semaforo-ejec');
    const ct = document.getElementById('card-semaforo-tol');
    const cv = document.getElementById('card-semaforo-venc');
    
    if (cb) cb.className = 'kpi-card ' + (pAvance >= 90 ? 'status-success' : (pAvance >= 75 ? 'status-warning' : 'status-danger'));
    if (ct) ct.className = 'kpi-card ' + (totals.tol > 0 ? 'status-warning' : 'status-success');
    if (cv) cv.className = 'kpi-card ' + (totals.venc > 0 ? 'status-danger' : 'status-success');

    // Actualización de textos de cabeceras
    if (document.getElementById('txt-periodo-titulo')) {
        document.getElementById('txt-periodo-titulo').innerText = `Dashboard Directivo: Hoja ${sheetName.toUpperCase()}`;
    }
    if (document.getElementById('lbl-periodo-actual')) {
        document.getElementById('lbl-periodo-actual').innerHTML = `<i class="fa-solid fa-file-invoice"></i> Origen: ${sheetName}`;
    }

    // Redacción automatizada del diagnóstico operativo
    let insightsText = "";
    if (totals.venc > 0) {
        insightsText = `⚠️ <strong>Atención Crítica:</strong> Se registran <strong>${totals.venc} mantenimientos vencidos</strong>. Se requiere coordinar acciones correctivas inmediatas para mitigar riesgos en la disponibilidad de los equipos. El porcentaje de avance actual es del <strong>${pAvance}%</strong>.`;
    } else if (pAvance >= 90) {
        insightsText = `🏆 <strong>Gestión Concluida:</strong> Cumplimiento sobresaliente. Se alcanzó un <strong>${pAvance}%</strong> del programa preventivo mensual, manteniendo el remanente seguro en periodos de tolerancia autorizados.`;
    } else {
        insightsText = `📊 <strong>Control Preventivo Estable:</strong> Nivel de avance global en <strong>${pAvance}%</strong>. No se presentan desviaciones críticas al día de hoy, manteniendo bajo observación el <strong>${pTol}%</strong> de la flota en estatus de tolerancia.`;
    }
    
    if (document.getElementById('txt-insights')) {
        document.getElementById('txt-insights').innerHTML = insightsText;
    }

    // Renderizado estructurado de filas en la tabla de desglose
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

    // === PASO OPERATIVO CLAVE ===
    // Primero hacemos visible el Dashboard en el DOM para que existan los canvas
    if (document.getElementById('view-upload')) document.getElementById('view-upload').classList.remove('active');
    if (document.getElementById('dashboard-wrapper')) document.getElementById('dashboard-wrapper').style.display = 'block';
    if (document.getElementById('dashboard-tab')) document.getElementById('dashboard-tab').classList.add('active');

    // Ahora inicializamos Chart.js de manera segura (charts.js ya encontrará los IDs)
    renderExecutiveCharts(dataset, [totals.ejec, totals.tol, totals.venc]);

    // Habilitar e intercambiar el foco visual del menú lateral de forma robusta
    const menuDashboard = document.getElementById('menu-dashboard');
    if (menuDashboard) {
        menuDashboard.classList.remove('disabled');
        menuDashboard.classList.add('active');
    }
    
    // Quitar el foco a la sección de carga inicial de manera segura
    const uploadItem = document.querySelector('.sidebar-item[data-tab="upload-tab"]') || document.querySelector('.sidebar-item.active');
    if (uploadItem) {
        uploadItem.classList.remove('active');
    }

    updateStatus('✔ Matriz de datos procesada con éxito.', 'success');
}