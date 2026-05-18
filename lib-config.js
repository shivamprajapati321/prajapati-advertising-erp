const CONFIG = {
  // Supabase
  SUPABASE_URL: 'https://shafygjbffffjhwhmcgo.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNoYWZ5Z2piZmZmZmpod2htY2dvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTM5MTE1NzMsImV4cCI6MjAyOTQ4NzU3M30.M8-p_PgqNaV_k-J5L6D3V8ZJZPfxQW0X0Y1Z2A3B4C5D',
  
  // Wati
  WATI_URL: 'https://live-mt-server.wati.io/1077226',
  WATI_JWT: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhY2NvdW50X2lkIjoiMTA3NzIyNiIsImh0dHBzOi8vd2F0aS5pbyI6eyJhY2NvdW50X2lkIjoiMTA3NzIyNiIsInNlbmRlciI6dHJ1ZSwiYWNjZXNzX2xldmVsIjoiQUNDT1VOVF9BRE1JTiIsInVzZXJfaWQiOiJ1c2VyLTEwNzcyMjYtYWRtaW4ifX0.jH-0SHK-_5KZ-6L-7M-8N-9O-0P-1Q-2R-3S-4T-5U',
  
  // App
  APP_NAME: 'Prajapati ERP',
  APP_VERSION: '2.0.0'
};

// Initialize Supabase
let supabaseClient = null;

async function initSupabase() {
  if (supabaseClient) return supabaseClient;
  
  const { createClient } = window.supabase;
  if (!createClient) {
    console.error('❌ Supabase library not loaded');
    return null;
  }

  try {
    supabaseClient = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
    return supabaseClient;
  } catch (error) {
    console.error('❌ Supabase init failed:', error);
    return null;
  }
}

// Make available globally
window.CONFIG = CONFIG;
window.initSupabase = initSupabase;
