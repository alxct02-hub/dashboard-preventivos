// js/utils.js — Funciones de utilidad compartidas

function getValue(row, key) {
  if (!row) return '';
  return String(row[key] ?? row[key.trim()] ?? row[key + ' '] ?? '').trim();
}

function parseCosto(row) {
  const n = parseFloat(String(getValue(row, 'Costo')).replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
}

function formatCosto(val) {
  const n = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
  if (isNaN(n) || n === 0) return '—';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(num, den) {
  if (!den) return 0;
  return Math.round((num / den) * 1000) / 10;
}

function fmtPct(val) {
  return (val % 1 === 0 ? val : Number(val).toFixed(1)) + '%';
}

function progressBar(value, color) {
  return `<div style="display:flex;align-items:center;gap:6px">
    <div class="progress-bg" style="flex:1">
      <div class="progress-fill" style="width:${Math.min(value, 100)}%;background:${color}"></div>
    </div>
    <span style="min-width:42px;font-size:0.8rem;font-weight:600;color:${color}">${fmtPct(value)}</span>
  </div>`;
}

function calColor(v) {
  if (v >= 80) return '#16a34a';
  if (v >= 50) return '#d97706';
  return '#dc2626';
}

function esEjecutado(row) {
  return getValue(row, 'Estatus').toLowerCase().includes('ejecutado');
}

function esEnTolerancia(row) {
  return getValue(row, 'Estatus').toLowerCase().includes('tolerancia');
}

function esVencido(row) {
  return !esEjecutado(row) && !esEnTolerancia(row);
}

function mesAñoKey(row) {
  const m = getValue(row, 'Mes');
  const a = getValue(row, 'Año');
  return (m && a) ? `${m}/${a}` : '';
}

function sortMesAño(a, b) {
  const [aMes, aAño] = a.split('/');
  const [bMes, bAño] = b.split('/');
  const dif = parseInt(aAño || 0) - parseInt(bAño || 0);
  if (dif !== 0) return dif;
  return MESES_ORDEN.indexOf(aMes) - MESES_ORDEN.indexOf(bMes);
}
