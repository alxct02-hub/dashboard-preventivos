// js/procesamiento.js — FASE 2 + 7 + Clasificación Centralizada
// FLUJO: Excel → Normalización → Clasificación → KPIs (solo contar)

// Convierte nombre de mes a número (Enero=1, Febrero=2, ...), o devuelve el número si ya lo es
function mesANumero(valor) {
  if (!valor) return 0;
  const n = parseInt(valor);
  if (!isNaN(n) && n >= 1 && n <= 12) return n;
  const idx = MESES_ORDEN.indexOf(String(valor).trim());
  return idx >= 0 ? idx + 1 : 0;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASIFICACIÓN DE CADA SERVICIO — Reglas definitivas (una sola fuente de verdad)
// ════════════════════════════════════════════════════════════════════════════
function clasificarServicio(r) {
  const estatus = getValue(r, 'Estatus').toLowerCase().trim();
  const motivo  = getValue(r, 'Motivo').toLowerCase();

  // Mes numéricos para comparación
  const mesActual = mesANumero(getValue(r, 'Mes'));
  const mesKPI    = mesANumero(getValue(r, 'Mes KPI'));

  // Clasificación base por estatus
  const esEjecutadoStatus = estatus === 'ejecutado';
  const esPendienteStatus = estatus === 'pendiente';

  // Tolerancia: motivos válidos
  const motivosTolerancia = ['tolerancia', 'horómetro', 'kilometraje', 'm3'];
  const motivoIndicaTolerancia = motivosTolerancia.some(m => motivo.includes(m));

  // Reglas definitivas
  return {
    ejecutado:    esEjecutadoStatus,
    pendiente:    esPendienteStatus && !motivoIndicaTolerancia,
    reprogramado: mesActual !== 0 && mesKPI !== 0 && mesActual !== mesKPI,
    heredado:     mesActual > mesKPI && esPendienteStatus,
    tolerancia:   esPendienteStatus && motivoIndicaTolerancia,
    vencido:      esPendienteStatus && !motivoIndicaTolerancia,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PROCESAMIENTO PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
function procesarDatos() {
  // 1. Clasificar TODOS los registros una sola vez
  APP.clasificados = APP.allData.map(r => ({
    ...r,
    _cls: clasificarServicio(r)
  }));

  // 2. Clasificar los filtrados
  APP.clasificadosFiltrados = APP.filteredData.map(r => {
    // Si ya está en clasificados, reutilizar; si no, clasificar
    const existente = APP.clasificados.find(c => c === r);
    return existente || { ...r, _cls: clasificarServicio(r) };
  });

  // 3. KPIs — solo contar, no calcular
  const c = APP.clasificadosFiltrados;
  const programados   = c.length;
  const ejecutados    = c.filter(x => x._cls.ejecutado).length;
  const enTolerancia  = c.filter(x => x._cls.tolerancia).length;
  const vencidos      = c.filter(x => x._cls.vencido).length;    // pendientes sin tolerancia
  const reprogramados = c.filter(x => x._cls.reprogramado).length;
  const heredados     = c.filter(x => x._cls.heredado).length;   // mes > mesKPI y pendiente
  const costoTotal    = c.reduce((s, r) => s + parseCosto(r), 0);

  // 4. Histórico mergeado — usa datos filtrados para que el Cierre Mensual responda a filtros
  APP.metricasPorMes = calcularMetricasPorMesFiltrado();

  // 5. Nuevos KPIs: % Tolerancia e Índice de Desempeño Preventivo
  const pctCumplimiento = pct(ejecutados, programados);
  const pctTolerancia   = pct(enTolerancia, programados);
  const indiceDesempeno = pctCumplimiento + pctTolerancia;

  APP.metricas = {
    programados, ejecutados, enTolerancia, vencidos, reprogramados,
    heredados, costoTotal, pctCumplimiento, pctTolerancia, indiceDesempeno
  };
}

// ════════════════════════════════════════════════════════════════════════════
// HISTORICO MERGEADO (congelados + vivos) — Filtrado
// ════════════════════════════════════════════════════════════════════════════
function calcularMetricasPorMesFiltrado() {
  // Desde DATA filtrada usando clasificación
  const dataMeses = {};
  APP.clasificadosFiltrados.forEach(r => {
    const key = mesAñoKey(r);
    if (!key) return;
    if (!dataMeses[key]) dataMeses[key] = { programados: 0, ejecutados: 0, tolerancia: 0, pendientes: 0, reprogramados: 0, heredados: 0, vencidos: 0, costo: 0, esHistorico: false };
    dataMeses[key].programados++;
    if (r._cls.ejecutado)   dataMeses[key].ejecutados++;
    if (r._cls.tolerancia)  dataMeses[key].tolerancia++;
    if (r._cls.pendiente)   dataMeses[key].pendientes++;
    if (r._cls.reprogramado)dataMeses[key].reprogramados++;
    if (r._cls.heredado)    dataMeses[key].heredados++;
    if (r._cls.vencido)     dataMeses[key].vencidos++;
    dataMeses[key].costo += parseCosto(r);
  });

  // HISTORICO sobrescribe (mes cerrado = inmutable)
  const merged = { ...dataMeses };
  APP.historico.forEach(r => {
    const key = `${r.Mes}/${r.Año}`;
    // Solo incluir meses que están presentes en los datos filtrados
    // (respeta el filtro de mes; otros filtros no aplican al histórico)
    if (!dataMeses[key] && r.estado === 'cerrado') {
      merged[key] = {
        programados:  r.Programados,
        ejecutados:   r.Ejecutados,
        tolerancia:   r.Tolerancia,
        pendientes:   r.Pendientes,
        reprogramados: 0,
        heredados:    0,
        vencidos:     r.Pendientes,
        cumplFijo:    r.Cumplimiento,
        costo:        0,
        esHistorico:  true,
      };
    } else if (dataMeses[key] && r.estado === 'cerrado') {
      merged[key] = {
        programados:  r.Programados,
        ejecutados:   r.Ejecutados,
        tolerancia:   r.Tolerancia,
        pendientes:   r.Pendientes,
        reprogramados: dataMeses[key].reprogramados,
        heredados:    dataMeses[key].heredados,
        vencidos:     r.Pendientes,
        cumplFijo:    r.Cumplimiento,
        costo:        dataMeses[key].costo,
        esHistorico:  true,
      };
    }
  });
  return merged;
}

