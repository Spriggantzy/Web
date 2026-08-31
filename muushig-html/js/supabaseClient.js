import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let client = null;

// Supabase JS-г CDN-ээс ESM хэлбэрээр lazy ачаална, ингэснээр config хоосон үед
// сүлжээний хүсэлт огт явахгүй.
export async function getSupabase() {
  if (!isSupabaseConfigured) return null;
  if (client) return client;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
