// js/supabase-client.js — Cliente Supabase para catálogos

const SUPABASE_URL  = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MjA3NDQ1NzU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

// El CDN de Supabase expone `window.supabase` (objeto con createClient)
let _db = null;
function getDB() {
  if (!_db && window.supabase) {
    _db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _db;
}
