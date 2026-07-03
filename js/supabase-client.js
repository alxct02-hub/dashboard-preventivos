// js/supabase-client.js — Cliente Supabase para catálogos

const SUPABASE_URL  = 'https://quqguldxmijfcpyikveh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1cWd1bGR4bWlqZmNweWlrdmVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMwMjY3OTMsImV4cCI6MjA5ODYwMjc5M30.1TOFw8TnhpHlULuxIC56npIYZ_Qwa9P-oQ1aqCEx_ag';

let _db = null;
function getDB() {
  if (!_db && window.supabase) {
    _db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }
  return _db;
}
