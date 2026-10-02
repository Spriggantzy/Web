import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

let client = null;

export async function getSupabase() {
  if (client) return client;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}