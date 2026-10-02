import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface McpAuthSession {
  supabase: SupabaseClient;
  userId: string;
  userEmail: string;
}

let cacheSession: McpAuthSession | null = null;

function createSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase URL or Key is missing');
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
