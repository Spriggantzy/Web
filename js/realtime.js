import { getSupabase } from './supabaseClient.js';

export async function subscribeToRoom(roomId, onChange) {
  const supabase = await getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`room-${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${roomId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function subscribeToGame(gameId, onChange) {
  const supabase = await getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel(`game-${gameId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'game_actions', filter: `game_id=eq.${gameId}` }, onChange)
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}
