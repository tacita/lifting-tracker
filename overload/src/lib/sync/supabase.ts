import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/public';

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
	if (_client) return _client;
	const url = env.PUBLIC_SUPABASE_URL;
	const key = env.PUBLIC_SUPABASE_ANON_KEY;
	if (!url || !key) throw new Error('Supabase env vars not set');
	_client = createClient(url, key, {
		auth: {
			persistSession: true,
			autoRefreshToken: true,
			detectSessionInUrl: true
		}
	});
	return _client;
}
