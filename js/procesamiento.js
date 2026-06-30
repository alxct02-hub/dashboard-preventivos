// js/procesamiento.js — FASE 2 + 7: Capa de procesamiento con soporte HISTORICO

function procesarDatos() {
  const fd = APP.filteredData;

  const programados   = fd.length;
  const ejecutados    = fd.filter(esEjecutado).length;
  const enTolerancia  = fd.filter(esEnTolerancia).length;
  const pendientes    = fd.filter(esVencido).length;
  const reprogramados = fd.filter(r => getValue(r, 'Estatus').toLowerCase().includes('reprogramado')).length;
  const costoTotal    = fd.reduce((s, r) => s + parseCosto(r), 0);
  const backlog       = calcularBacklog(fd);

  // Histórico mergeado: HISTORICO (congelado) + meses vivos de DATA
  APP.metricasPorMes = calcularMetricasPorMesCompleto();

  // Cumplimiento acumulado: usa el histórico mergeado para incluir cierres congelados
  const vals       = Object.values(APP.metricasPorMes);
  const ejAcum     = vals.reduce((s, d) => s + d.ejecutados, 0);
  const tolAcum    = vals.reduce((s, d) => s + d.tolerancia, 0);
  const progAcum   = vals.reduce((s, d) => s + d.programados, 0);
  const cumplimientoAcum = pct(ejAcum + tolAcum, progAcum);

  APP.metricas = { programados, ejecutados, enTolerancia, pendientes, reprogramados, costoTotal, backlog, cumplimientoAcum };
}

function calcularBacklog(data) {
  const meses = [...new Set(data.map(mesAñoKey).filter(Boolean))].sort(sortMesAño);
  if (meses.length <= 1) return 0;
  const ultimo = meses[meses.length - 1];
  return data.filter(r => mesAñoKey(r) !== ultimo && esVencido(r)).length;
}
