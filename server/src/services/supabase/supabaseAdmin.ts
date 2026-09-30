import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import config from '../../config';

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = config.supabaseUrl;
  const serviceKey = config.supabaseServiceRoleKey;

  if (url && serviceKey) {
    supabaseAdminClient = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      realtime: {
        transport: ws as any,
      },
    });
    return supabaseAdminClient;
  }

  if (config.nodeEnv === 'production') {
    throw new Error('Supabase URL or Service Role Key is missing in production environment variables.');
  }

  return null;
}
