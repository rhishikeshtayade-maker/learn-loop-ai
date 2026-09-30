import { createClient, SupabaseClient } from '@supabase/supabase-js';
import ws from 'ws';
import config from '../../config';

let supabaseAdminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (supabaseAdminClient) return supabaseAdminClient;

  const url = config.supabaseUrl;
  const serviceKey = config.supabaseServiceRoleKey;

  if (url && serviceKey) {
    try {
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
    } catch (err) {
      console.error('Failed to create Supabase client:', err);
      return null;
    }
  }

  if (config.nodeEnv === 'production') {
    console.error('Supabase URL or Service Role Key is missing in production environment variables.');
  }

  return null;
}
