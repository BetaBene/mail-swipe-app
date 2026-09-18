import { createClient } from 'npm:@supabase/supabase-js@2';

// Service-role client: bypasses RLS, must never be exposed to the app.
// Used by edge functions to read/write imap_accounts and to write
// cached_emails / swipe_actions / user_stats on the user's behalf after
// verifying their JWT below.
export function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace('Bearer ', '');
  if (!jwt) return null;

  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(jwt);
  if (error || !data.user) return null;
  return data.user;
}
