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

  return null;
}

export const supabaseAdmin = getSupabaseAdmin();

