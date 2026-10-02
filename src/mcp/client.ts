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

export async function loginToMcp(email: string, password: string) {
  const supabase = createSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    throw new Error(
      `Login failed: ${error?.message || 'Email or password is incorect'}`,
    );
  }

  cacheSession = {
    supabase,
    userId: data.user.id,
    userEmail: data.user.email || email,
  };

  return {
    userId: data.user.id,
    email: data.user.email || email,
  };
}

export async function logoutFromMcp() {
  cacheSession = null;
}

export function getMcpAuthStatus() {
  if (cacheSession) {
    return {
      isAuthenticated: true,
      email: cacheSession.userEmail,
      userId: cacheSession.userId,
    };
  }
  return {
    isAuthenticated: false,
  };
}

export async function getMcpSession() {
  if (cacheSession) {
    return cacheSession;
  }

  throw new Error('Please login with your Fina Account.');
}
