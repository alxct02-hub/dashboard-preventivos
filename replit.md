# ConcrePlus — Gestión de Mantenimiento Preventivo

## Project Overview
Static web dashboard (HTML + vanilla JS) for tracking and closing preventive maintenance records. No build step — all dependencies loaded via CDN (Tailwind, Chart.js, XLSX, Supabase JS, Tabler Icons).

**Backend:** Firebase (Firestore + Auth) for snapshots, month states, edits, and audit log. Supabase used for catalogue data.

**Authentication:** Firebase Email/Password for admin. Anonymous Firebase session auto-created for read-only (consultation) view.

## How to Run
Served with Python's built-in HTTP server:
```
python3 -m http.server 5000
```
Workflow: `Start application` (configured in Replit).

## Project Structure
```
index.html           — Single-page app shell + all HTML
js/
  app.js             — Tab routing, admin auth UI, bootstrap
  firebase.js        — Firebase SDK (ES module), all Firestore/Auth operations
  estado.js          — Global APP state object
  procesamiento.js   — Data classification (ejecutado/pendiente/tolerancia/vencido)
  datos.js           — Data loading, editing, historial por equipo search
  kpis.js            — KPI cards, cierre mensual table, detail table
  graficas.js        — Chart.js charts
  historico.js       — Month close/reopen modal logic
  indicador.js       — Indicator tab
  catalogo.js        — Catalogue tab (Supabase)
  analisis.js        — AI analysis tab
  exportaciones.js   — Excel export
  utils.js           — Shared helpers
  supabase-client.js — Supabase client init
public/
  ConcrePlus-Logotipo-768x307.png
supabase/migrations/ — Supabase migration SQL files
```

## Key Behaviors
- **Admin only:** "Cerrar Mes" button (`#btnCerrarMes`) is hidden by default; shown only when authenticated as admin via `_onAuthChange`.
- **Consultation view:** Shows closed-month badges but has no close/reopen controls and no edit capability.
- **Historial por Equipo:** Filters results to `Estatus === 'ejecutado'` only — pendiente records are excluded.
- **Month closure:** Freezes data in Firestore; "Reabrir" button shown only for admin.

## User Preferences
- Keep existing project structure — do not restructure or migrate the stack.
