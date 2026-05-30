/**
 * MOTOR DE EXTRACCIÓN DINÁMICA DE DATOS Y DISTRIBUCIÓN
 */
function parseExcelMatrix(matrix, sheetName) {
    let dataset = [];
    let rIdx = -1, cTipo = -1, cPlan = -1, cEjec = -1, cTol = -1, cVenc = -1;

    // Colecciones de acumulación cruzada
    let distribucionUbicaciones = {};
    let distribucionServicios = {};
    let distribucionUnidades = { revolvedoras: 0, bombas: 0, maquinaria: 0, plantas: 0 };

    // 1. ESCANEO DINÁMICO DE FILAS PARA HALLAR LA TABLA GENERAL DE CONTROL (CUMPLIMIENTO)
    for (let i = 0; i < matrix.length; i++) {
        let row = matrix[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
            if (!row[j]) continue;
            let val = String(row[j]).toLowerCase().trim();
            if (val.includes('tipo eq') || val.includes('equipo')) { cTipo = j; rIdx = i; }
            if (val.includes('plan./emer') || val.includes('plan/emer') || val.includes('planific')) cPlan = j;
            if (val.includes('ejecutado')) cEjec = j;
            if (val.includes('tolerancia')) cTol = j;
            if (val.includes('vencido')) cVenc = j;
        }
        if (rIdx !== -1 && cPlan !== -1 && cEjec !== -1) break;
    }

    // Índices de respaldo por estructura física si hay cambios de celdas
    if (cTipo === -1) { cTipo = 4; cPlan = 5; cEjec = 6; cTol = 7; cVenc = 8; rIdx = 5; }

    let tPlan = 0, tEjec = 0, tTol = 0, tVenc = 0;
    let startRow = rIdx !== -1 ? rIdx + 1 : 0;

    for (let i = startRow; i < matrix.length; i++) {
        let row = matrix[i];
        if (!row || row[cTipo] === undefined || String(row[cTipo]).trim() === "") continue;

        let eqName = String(row[cTipo]).trim();
        let eqNameLow = eqName.toLowerCase();

        // Al toparnos con los totales consolidados de la hoja, guardamos los valores y cerramos
        if (eqNameLow.includes('total')) {
            tPlan = parseInt(row[cPlan]) || 0;
            tEjec = parseInt(row[cEjec]) || 0;
            tTol = parseInt(row[cTol]) || 0;
            tVenc = parseInt(row[cVenc]) || 0;
            break;
        }

        // Mapear filas operativas válidas
        if (eqNameLow.includes('planta') || eqNameLow.includes('olla') || 
            eqNameLow.includes('bomba') || eqNameLow.includes('trascabo') || 
            eqNameLow.includes('retro') || eqNameLow.includes('auxiliar')) {

            let p = parseInt(row[cPlan]) || 0;
            let e = parseInt(row[cEjec]) || 0;
            let t = parseInt(row[cTol]) || 0;
            let v = parseInt(row[cVenc]) || 0;
            let pct = p > 0 ? ((e / p) * 100).toFixed(0) : 0;

            dataset.push({ tipo: eqName, plan: p, ejec: e, tol: t, venc: v, pct: pct });
        }
    }

    // Fallback matemático si no leyó la fila "Total" consolidada
    if (tPlan === 0) {
        dataset.forEach(x => { tPlan += x.plan; tEjec += x.ejec; tTol += x.tol; tVenc += x.venc; });
    }

    // 2. ESCANEO AVANZADO PARA FILTRAR DISTRIBUCIONES (GRÁFICAS DE LA IMAGEN 2)
    let colUbic = -1, colMtto = -1, colUni = -1;
    for (let i = 0; i < Math.min(matrix.length, 15); i++) {
        let row = matrix[i];
        if (!row) continue;
        for (let j = 0; j < row.length; j++) {
            let txt = String(row[j]).toLowerCase().trim();
            if (txt.includes('ubicación') || txt.includes('planta')) colUbic = j;
            if (txt.includes('tipo mtto') || txt.includes('servicio') || txt.includes('mantenimiento')) colMtto = j;
            if (txt.includes('n°') || txt.includes('unidad') || txt.includes('equipo')) colUni = j;
        }
    }

    // Ajustes por defecto si mapea desde la hoja en formato extendido
    if (colUbic === -1) colUbic = 0;
    if (colMtto === -1) colMtto = 5;
    if (colUni === -1) colUni = 1;

    for (let i = 0; i < matrix.length; i++) {
        let row = matrix[i];
        // Saltarnos cabeceras iniciales
        if (!row || i <= rIdx) continue;

        let uVal = row[colUbic] ? String(row[colUbic]).trim() : "";
        let mVal = row[colMtto] ? String(row[colMtto]).trim() : "";
        let nVal = row[colUni] ? String(row[colUni]).trim().toUpperCase() : "";

        if (uVal === "" || uVal.toLowerCase().includes('total') || uVal.toLowerCase().includes('ubicación')) continue;

        // Acumulación por Ubicación (Ej: Oriente, Dzityá, Norte, WAAD...)
        distribucionUbicaciones[uVal] = (distribucionUbicaciones[uVal] || 0) + 1;

        // Acumulación por Tipo de Mantenimiento (Ej: Servicio A, B, PM2...)
        if (mVal !== "" && !mVal.toLowerCase().includes('tipo')) {
            distribucionServicios[mVal] = (distribucionServicios[mVal] || 0) + 1;
        }

        // Clasificación por Nomenclatura del Equipo
        if (nVal.startsWith('RC') || uVal.toLowerCase().includes('olla')) {
            distribucionUnidades.revolvedoras++;
        } else if (nVal.startsWith('BC') || nVal.startsWith('BE') || uVal.toLowerCase().includes('bomba')) {
            distribucionUnidades.bombas++;
        } else if (nVal.startsWith('EX') || nVal.startsWith('RT') || uVal.toLowerCase().includes('trascabo') || uVal.toLowerCase().includes('retro')) {
            distribucionUnidades.maquinaria++;
        } else if (uVal.toLowerCase().includes('planta') || nVal.startsWith('PT')) {
            distribucionUnidades.plantas++;
        }
    }

    return { 
        dataset, 
        totals: { plan: tPlan, ejec: tEjec, tol: tTol, venc: tVenc },
        distributions: {
            ubicaciones: distribucionUbicaciones,
            servicios: distribucionServicios,
            unidades: distribucionUnidades
        }
    };
}