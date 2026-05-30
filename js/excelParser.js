/**
 * Lógica robusta para extraer los datos de la pestaña de mantenimientos.
 */
function parseExcelMatrix(matrix, sheetName) {
    let dataset = [];
    let rIdx = -1, cTipo = -1, cPlan = -1, cEjec = -1, cTol = -1, cVenc = -1;

    // Escaneo dinámico para localizar la tabla de control
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

    // Fallback por índice físico si las cabeceras fueron modificadas
    if (cTipo === -1) { cTipo = 4; cPlan = 5; cEjec = 6; cTol = 7; cVenc = 8; rIdx = 5; }

    let tPlan = 0, tEjec = 0, tTol = 0, tVenc = 0;
    let startRow = rIdx !== -1 ? rIdx + 1 : 0;

    for (let i = startRow; i < matrix.length; i++) {
        let row = matrix[i];
        if (!row || row[cTipo] === undefined || String(row[cTipo]).trim() === "") continue;

        let eqName = String(row[cTipo]).trim();
        let eqNameLow = eqName.toLowerCase();

        // Si topamos con la fila consolidada del reporte, guardamos los totales directos
        if (eqNameLow.includes('total')) {
            tPlan = parseInt(row[cPlan]) || 0;
            tEjec = parseInt(row[cEjec]) || 0;
            tTol = parseInt(row[cTol]) || 0;
            tVenc = parseInt(row[cVenc]) || 0;
            break;
        }

        // Mapeo selectivo de familias de maquinaria de la flota
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

    // Si los totales no se leyeron de la fila de Excel, los calculamos sumando el dataset limpio
    if (tPlan === 0) {
        dataset.forEach(x => { 
            tPlan += x.plan; tEjec += x.ejec; tTol += x.tol; tVenc += x.venc; 
        });
    }

    return { dataset, totals: { plan: tPlan, ejec: tEjec, tol: tTol, venc: tVenc } };
}