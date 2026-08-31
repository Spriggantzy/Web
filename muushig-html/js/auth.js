import { getSupabase } from './supabaseClient.js';

export async function signUp(email, password, username) {
  const supabase = await getSupabase();
  if (!supabase) return { error: { message: 'Supabase тохируулаагүй байна. js/config.js файлаа бөглөнө үү.' } };
  const result = await supabase.auth.signUp({ email, password, options: { data: { username } } });
  return result;
}

export async function signIn(email, password) {
  const supabase = await getSupabase();
  if (!supabase) return { error: { message: 'Supabase тохируулаагүй байна. js/config.js файлаа бөглөнө үү.' } };
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  const supabase = await getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}
