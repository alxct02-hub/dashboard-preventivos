/**
 * Procesa la matriz binaria del Excel de forma tolerante a desplazamientos de celdas.
 */
function parseExcelMatrix(matrix, sheetName) {
    let dataset = [];
    let rIdx = -1, cTipo = -1, cPlan = -1, cEjec = -1, cTol = -1, cVenc = -1;

    // Localizar dinámicamente las cabeceras nativas del reporte corporativo
    for(let i = 0; i < matrix.length; i++) {
        let row = matrix[i];
        if(!row) continue;
        for(let j = 0; j < row.length; j++) {
            let val = String(row[j]).toLowerCase().trim();
            if(val.includes('tipo eq') || val.includes('equipo')) { cTipo = j; rIdx = i; }
            if(val.includes('plan./emer') || val.includes('plan/emer') || val.includes('planific')) cPlan = j;
            if(val.includes('ejecutado')) cEjec = j;
            if(val.includes('tolerancia')) cTol = j;
            if(val.includes('vencido')) cVenc = j;
        }
        if(rIdx !== -1 && cPlan !== -1 && cEjec !== -1) break;
    }

    // Fallback indexado estándar por si se alteran las etiquetas
    if(cTipo === -1) { cTipo = 4; cPlan = 5; cEjec = 6; cTol = 7; cVenc = 8; rIdx = 5; }

    let tPlan = 0, tEjec = 0, tTol = 0, tVenc = 0;
    let startRow = rIdx !== -1 ? rIdx + 1 : 0;

    for(let i = startRow; i < matrix.length; i++) {
        let row = matrix[i];
        if(!row || row[cTipo] === undefined || String(row[cTipo]).trim() === "") continue;

        let eqName = String(row[cTipo]).trim();
        let eqNameLow = eqName.toLowerCase();

        // Parar la lectura e importar totales si el archivo Excel cuenta con una fila resumen al final
        if(eqNameLow.includes('total')) {
            tPlan = parseInt(row[cPlan]) || tPlan;
            tEjec = parseInt(row[cEjec]) || tEjec;
            tTol = parseInt(row[cTol]) || tTol;
            tVenc = parseInt(row[cVenc]) || tVenc;
            break;
        }

        // Filtrado de las familias clave de la operación
        if(eqNameLow.includes('planta') || eqNameLow.includes('olla') || 
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

    // Si la lectura de totales del archivo falló, consolidar mediante suma iterativa lineal limpia
    if(tPlan === 0) {
        dataset.forEach(x => { tPlan += x.plan; tEjec += x.ejec; tTol += x.tol; tVenc += x.venc; });
    }

    return { dataset, totals: { plan: tPlan, ejec: tEjec, tol: tTol, venc: tVenc } };
}