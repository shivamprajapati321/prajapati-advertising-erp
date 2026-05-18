// ════════════════════════════════════════════════════════════════
// PRAJAPATI ERP - Configuration Library
// Supabase Setup & Helpers
// ════════════════════════════════════════════════════════════════

const SUPABASE_URL = 'https://shafygjbffffjhwhmcgo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWZ5Z2piZmZmZmpod2htY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTg0MjU2OTksImV4cCI6MTk5OTk5OTY5OX0.TZeVNNL5N6zW4kJK8pQ2zL9mR3sT5uV6wX7yZ8aB9cD';

// Initialize Supabase
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

function sb() {
  return supabaseClient;
}

// Session storage key
const SESSION_KEY = 'prajapati_erp_session';

// Store session
function setSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Get session
function getSession() {
  const stored = localStorage.getItem(SESSION_KEY);
  return stored ? JSON.parse(stored) : null;
}

// Clear session
function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

// Log helper
function log(msg, data = null) {
  console.log(`[PRAJAPATI ERP] ${msg}`, data || '');
}

function logError(msg, err = null) {
  console.error(`[PRAJAPATI ERP ERROR] ${msg}`, err || '');
}
