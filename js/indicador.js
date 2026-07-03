// js/indicador.js — Indicador de Cumplimiento por Tipo de Equipo

const TIPO_CONFIG = [
  // ORDEN VISUAL de la tabla (de arriba a abajo)
  { label: 'Plantas',                  badge: 'P', prefixes: ['P'],              badgeColor: '#1e3a5f', badgeBg: '#dbeafe' },
  { label: 'Ollas',                    badge: 'R', prefixes: ['R'],              badgeColor: '#16a34a', badgeBg: '#dcfce7' },
  { label: 'Bombas',                   badge: 'B', prefixes: ['B'],              badgeColor: '#e8870f', badgeBg: '#fef3e2' },
  { label: 'Trascabos / Retro',        badge: 'T', prefixes: ['T', 'EX'],        badgeColor: '#7c3aed', badgeBg: '#ede9fe' },
  { label: 'Eq. Auxiliares (PG/BG)',   badge: 'A', prefixes: ['PG', 'BG'],       badgeColor: '#475569', badgeBg: '#e2e8f0' },
];

// Construye la lista de candidatos ordenando los prefijos por longitud descendente.
// Esto evita que 'P' coincida antes que 'PG', o 'B' antes que 'BG'.
const _candidatos = TIPO_CONFIG
  .flatMap(cfg => cfg.prefixes.map(prefix => ({ cfg, prefix })))
  .sort((a, b) => b.prefix.length - a.prefix.length);

function classifyTipo(tipoVal) {
  if (!tipoVal) return null;
  const upper = tipoVal.toUpperCase().trim();
  for (const { cfg, prefix } of _candidatos) {
    if (upper.startsWith(prefix)) return cfg;
  }
  return null;
}

function isExcluded(row) {
  const fields = [getValue(row, 'Tipo mtto'), getValue(row, 'Servicio'), getValue(row, 'Descripcion'), getValue(row, 'Tipo')];
  return fields.some(f => f.toUpperCase().includes('MOTOR'));
}

function renderIndicador() {
  const fuente = APP.clasificados.length > 0
    ? APP.clasificados
    : APP.allData.map(r => ({ ...r, _cls: clasificarServicio(r) }));

  const rows = fuente.filter(r => {
    if (isExcluded(r)) return false;
    if (APP.indMesValue && mesAñoKey(r) !== APP.indMesValue) return false;
    return true;
  });

  const grupos = {};
  TIPO_CONFIG.forEach(cfg => { grupos[cfg.label] = { cfg, plan: 0, ejec: 0, tol: 0, venc: 0 }; });

  rows.forEach(row => {
    const cfg = classifyTipo(getValue(row, 'Tipo'));
    if (!cfg) return;
    const g   = grupos[cfg.label];
    const cls = row._cls || clasificarServicio(row);
    g.plan++;
    if (cls.ejecutado)       g.ejec++;
    else if (cls.tolerancia) g.tol++;
    else                     g.venc++;
  });

  let tPlan = 0, tEjec = 0, tTol = 0, tVenc = 0;
  Object.values(grupos).forEach(g => { tPlan += g.plan; tEjec += g.ejec; tTol += g.tol; tVenc += g.venc; });

  document.getElementById('indTotalPlan').textContent = tPlan;
  document.getElementById('indTotalEjec').textContent = tEjec;
  document.getElementById('indTotalTol').textContent  = tTol;
  document.getElementById('indTotalVenc').textContent = tVenc;

  const tbody = document.getElementById('indicadorBody');
  tbody.innerHTML = '';

  TIPO_CONFIG.forEach(cfg => {
    const g       = grupos[cfg.label];
    const pAvance = pct(g.ejec, g.plan);
    const pTol    = pct(g.tol,  g.plan);
    const pVenc   = pct(g.venc, g.plan);
    const calScore = pct(g.ejec + g.tol, g.plan);

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="padding:14px">
        <div style="display:flex;align-items:center;gap:10px">
          <span class="badge-circle" style="background:${cfg.badgeBg};color:${cfg.badgeColor}">${cfg.badge}</span>
          <span style="font-weight:500">${cfg.label}</span>
        </div>
      </td>
      <td>${g.plan}</td><td>${g.ejec}</td><td>${g.tol}</td><td>${g.venc}</td>
      <td>${progressBar(pAvance, '#16a34a')}</td>
      <td>${progressBar(pTol,    '#d97706')}</td>
      <td>${progressBar(pVenc,   '#dc2626')}</td>
      <td style="font-weight:700;font-size:1rem;color:${calColor(calScore)}">${fmtPct(calScore)}</td>`;
    tbody.appendChild(tr);
  });

  const tCal    = pct(tEjec + tTol, tPlan);
  const tAvance = pct(tEjec, tPlan);
  const tTolP   = pct(tTol,  tPlan);
  const tVencP  = pct(tVenc, tPlan);

  document.getElementById('indicadorFoot').innerHTML = `
    <tr>
      <td style="text-align:left;padding:14px">Total</td>
      <td>${tPlan}</td><td>${tEjec}</td><td>${tTol}</td><td>${tVenc}</td>
      <td>${fmtPct(tAvance)}</td>
      <td>${fmtPct(tTolP)}</td>
      <td>${fmtPct(tVencP)}</td>
      <td>${fmtPct(tCal)}</td>
    </tr>`;
}

function onIndMesChange() {
  APP.indMesValue = document.getElementById('indMesFilter').value;
  renderIndicador();
}

function resetIndFilter() {
  APP.indMesValue = '';
  document.getElementById('indMesFilter').value = '';
  renderIndicador();
}
