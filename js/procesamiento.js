// js/procesamiento.js — FASE 2: Capa de procesamiento de datos

function procesarDatos() {
  const fd = APP.filteredData;

  const programados   = fd.length;
  const ejecutados    = fd.filter(esEjecutado).length;
  const enTolerancia  = fd.filter(esEnTolerancia).length;
  const pendientes    = fd.filter(esVencido).length;
  const reprogramados = fd.filter(r => getValue(r, 'Estatus').toLowerCase().includes('reprogramado')).length;
  const costoTotal    = fd.reduce((s, r) => s + parseCosto(r), 0);

  // Backlog: vencidos de meses anteriores al más reciente en filteredData
  const backlog = calcularBacklog(fd);

  // Cumplimiento acumulado histórico (sobre allData completo)
  const ejAll  = APP.allData.filter(esEjecutado).length;
  const tolAll = APP.allData.filter(esEnTolerancia).length;
  const cumplimientoAcum = pct(ejAll + tolAll, APP.allData.length);

  APP.metricas = { programados, ejecutados, enTolerancia, pendientes, reprogramados, costoTotal, backlog, cumplimientoAcum };

  // Histórico mensual (sobre allData para tabla de cierre y tendencia)
  APP.metricasPorMes = calcularMetricasPorMes(APP.allData);
}

function calcularMetricasPorMes(data) {
  const porMes = {};
  data.forEach(row => {
    const key = mesAñoKey(row);
    if (!key) return;
    if (!porMes[key]) porMes[key] = { programados: 0, ejecutados: 0, tolerancia: 0, pendientes: 0, costo: 0 };
    porMes[key].programados++;
    if (esEjecutado(row))     porMes[key].ejecutados++;
    else if (esEnTolerancia(row)) porMes[key].tolerancia++;
    else                      porMes[key].pendientes++;
    porMes[key].costo += parseCosto(row);
  });
  return porMes;
}

function calcularBacklog(data) {
  const meses = [...new Set(data.map(mesAñoKey).filter(Boolean))].sort(sortMesAño);
  if (meses.length <= 1) return 0;
  const ultimo = meses[meses.length - 1];
  return data.filter(r => mesAñoKey(r) !== ultimo && esVencido(r)).length;
}
