/**
 * js/supabase.js
 * Inicializador del cliente de Supabase para la aplicación Decathlon La Flora.
 */

// Credenciales por defecto (Configurables según el entorno del usuario)
const SUPABASE_URL = window.SUPABASE_URL || 'https://su-proyecto-supabase.supabase.co';
const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'tu-anon-key-aqui';

(function initSupabase() {
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      // Si la librería de Supabase está presente globalmente (CDN)
      if (SUPABASE_URL && SUPABASE_URL !== 'https://su-proyecto-supabase.supabase.co') {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('[Supabase] Cliente inicializado correctamente.');
      } else {
        console.warn('[Supabase] Credenciales no configuradas. La app funcionará en modo offline/local primario hasta configurar Supabase.');
        window.supabaseClient = null;
      }
    } else {
      console.warn('[Supabase] SDK no detectado. Modo offline activo.');
      window.supabaseClient = null;
    }
  } catch (err) {
    console.error('[Supabase] Error inicializando cliente:', err);
    window.supabaseClient = null;
  }
})();
