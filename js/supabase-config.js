/**
 * IM Platform — Supabase Client Configuration
 * 
 * This file initializes the global Supabase client used by all pages.
 * It must be loaded AFTER the Supabase JS SDK (<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>)
 */

const SUPABASE_URL = 'https://vrmhrdoabmxbacjmfugk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZybWhyZG9hYm14YmFjam1mdWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTA4ODksImV4cCI6MjA5MDE4Njg4OX0.0P9GWaF3VYZhoErU488-y24vKcAzncKfHa_i6XI4kg8'; // TODO: Replace with your actual anon key from Supabase Dashboard → Settings → API

const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

console.log('[IM] Supabase client initialized');
