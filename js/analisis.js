// js/analisis.js — FASE 6: Panel de Análisis Inteligente

function AnalisisIA() {
  const contenedor = document.getElementById('analisisContenido');
  if (!contenedor) return;

  const insights = _generarInsights();
  contenedor.innerHTML = insights
    .map(i => `
      <div class="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-blue-50 transition-colors duration-200">
        <div class="flex items-start gap-3">
          <div class="text-2xl flex-shrink-0 mt-0.5">${i.icono}</div>
          <div>
            <p class="font-semibold text-gray-800 text-sm mb-1">${i.titulo}</p>
            <p class="text-gray-600 text-sm leading-relaxed">${i.texto}</p>
          </div>
        </div>
      </div>`)
    .join('');
}

function _generarInsights() {
  const insights = [];
  const m   = APP.metricas;
  const pm  = APP.metricasPorMes;
  const fd  = APP.filteredData;
  const meses = Object.keys(pm).sort(sortMesAño);

  if (meses.length === 0 || m.programados === 0) {
    return [{ icono: 'ℹ️', titulo: 'Sin datos', texto: 'Cargue un archivo Excel para ver el análisis inteligente.' }];
  }

  // 1. Cumplimiento general del período
  const cumplPeriodo = pct(m.ejecutados + m.enTolerancia, m.programados);
  const nivelCumpl   = cumplPeriodo >= 80 ? 'excelente' : cumplPeriodo >= 50 ? 'aceptable' : 'bajo';
  const iconoCumpl   = cumplPeriodo >= 80 ? '✅' : cumplPeriodo >= 50 ? '⚠️' : '🔴';
  insights.push({
    icono: iconoCumpl,
    titulo: 'Cumplimiento del período seleccionado',
    texto: `El período presenta un cumplimiento de <strong>${fmtPct(cumplPeriodo)}</strong> — ${m.ejecutados} ejecutados y ${m.enTolerancia} en tolerancia sobre ${m.programados} programados. Nivel: <strong>${nivelCumpl}</strong>.`
  });

  // 2. Mejor y peor mes
  if (meses.length > 1) {
    const ranking = meses.map(mes => ({
      mes,
      cumpl: pct(pm[mes].ejecutados + pm[mes].tolerancia, pm[mes].programados),
    }));
    const mejor = ranking.reduce((a, b) => b.cumpl > a.cumpl ? b : a);
    const peor  = ranking.reduce((a, b) => b.cumpl < a.cumpl ? b : a);

    insights.push({
      icono: '🏆',
      titulo: 'Mejor mes del período',
      texto: `<strong>${mejor.mes}</strong> registró el mayor cumplimiento con <strong>${fmtPct(mejor.cumpl)}</strong>: ${pm[mejor.mes].ejecutados} ejecutados y ${pm[mejor.mes].tolerancia} en tolerancia de ${pm[mejor.mes].programados} programados.`
    });

    if (peor.mes !== mejor.mes) {
      insights.push({
        icono: '📉',
        titulo: 'Mes con mayor atención requerida',
        texto: `<strong>${peor.mes}</strong> presentó el menor cumplimiento con <strong>${fmtPct(peor.cumpl)}</strong> y ${pm[peor.mes].pendientes} servicio(s) vencido(s). Se recomienda análisis de causas raíz.`
      });
    }
  }

  // 3. Mes con más tolerancias
  const totalTolHist = meses.reduce((s, mes) => s + pm[mes].tolerancia, 0);
  if (totalTolHist > 0) {
    const maxTolMes = meses.reduce((a, b) => pm[b].tolerancia > pm[a].tolerancia ? b : a);
    const pctConc   = pct(pm[maxTolMes].tolerancia, totalTolHist);
    insights.push({
      icono: '⏱️',
      titulo: 'Mes con mayor concentración de tolerancias',
      texto: `<strong>${maxTolMes}</strong> concentró ${pm[maxTolMes].tolerancia} servicio(s) en tolerancia, representando el <strong>${fmtPct(pctConc)}</strong> del total de tolerancias del período histórico.`
    });
  }

  // 4. Backlog heredado
  if (m.backlog > 0) {
    insights.push({
      icono: '📦',
      titulo: 'Backlog heredado detectado',
      texto: `Se identificaron <strong>${m.backlog}</strong> servicio(s) vencido(s) de meses anteriores sin ejecutar. Representan compromisos de mantenimiento no cumplidos que requieren atención prioritaria.`
    });
  } else {
    insights.push({
      icono: '🎯',
      titulo: 'Sin backlog heredado',
      texto: 'No se identifican servicios vencidos de períodos anteriores. El equipo ha gestionado eficientemente los compromisos de mantenimiento.'
    });
  }

  // 5. Taller con mejor desempeño (filteredData)
  const porTaller = {};
  fd.forEach(r => {
    const t = getValue(r, 'Taller') || 'Sin asignar';
    if (!porTaller[t]) porTaller[t] = { ejec: 0, total: 0 };
    porTaller[t].total++;
    if (esEjecutado(r)) porTaller[t].ejec++;
  });
  const talleresLista = Object.keys(porTaller).filter(t => porTaller[t].total >= 2);
  if (talleresLista.length > 0) {
    const mejorTaller = talleresLista.reduce((a, b) =>
      pct(porTaller[b].ejec, porTaller[b].total) > pct(porTaller[a].ejec, porTaller[a].total) ? b : a
    );
    const pctT = pct(porTaller[mejorTaller].ejec, porTaller[mejorTaller].total);
    insights.push({
      icono: '🔧',
      titulo: 'Taller con mejor desempeño',
      texto: `<strong>${mejorTaller}</strong> lidera la ejecución con <strong>${fmtPct(pctT)}</strong> (${porTaller[mejorTaller].ejec} de ${porTaller[mejorTaller].total} servicios asignados).`
    });
  }

  // 6. Tendencia reciente (últimos 3 meses del histórico)
  if (meses.length >= 3) {
    const ult3 = meses.slice(-3);
    const vals = ult3.map(mes => pct(pm[mes].ejecutados + pm[mes].tolerancia, pm[mes].programados));
    const tendencia = vals[2] > vals[0] + 5 ? 'en mejora' : vals[2] < vals[0] - 5 ? 'declinante' : 'estable';
    const iconoTend = tendencia === 'en mejora' ? '📈' : tendencia === 'declinante' ? '📉' : '➡️';
    insights.push({
      icono: iconoTend,
      titulo: 'Tendencia de cumplimiento (últimos 3 meses)',
      texto: `Analizando ${ult3.join(', ')}: el cumplimiento muestra una tendencia <strong>${tendencia}</strong>. Evolución: ${ult3.map((mes, i) => `${mes} ${fmtPct(vals[i])}`).join(' → ')}.`
    });
  }

  // 7. Tipo de equipo con mayor cantidad de vencidos (en filteredData, si hay indicador disponible)
  const porTipoVenc = {};
  fd.filter(esVencido).forEach(r => {
    const cfg = classifyTipo(getValue(r, 'Tipo'));
    const label = cfg ? cfg.label.replace('\n', ' ') : 'Otros';
    porTipoVenc[label] = (porTipoVenc[label] || 0) + 1;
  });
  const tiposConVenc = Object.keys(porTipoVenc);
  if (tiposConVenc.length > 0) {
    const maxTipo    = tiposConVenc.reduce((a, b) => porTipoVenc[b] > porTipoVenc[a] ? b : a);
    const totalVenc  = Object.values(porTipoVenc).reduce((a, b) => a + b, 0);
    const pctTipo    = pct(porTipoVenc[maxTipo], totalVenc);
    insights.push({
      icono: '🚨',
      titulo: 'Tipo de equipo con más vencidos',
      texto: `Los equipos <strong>${maxTipo}</strong> concentran la mayor cantidad de vencidos: ${porTipoVenc[maxTipo]} servicio(s), equivalente al <strong>${fmtPct(pctTipo)}</strong> del total de vencidos del período.`
    });
  }

  return insights;
}
