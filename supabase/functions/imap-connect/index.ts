import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { encryptSecret } from '../_shared/crypto.ts';
import { createImapClient } from '../_shared/imap.ts';

interface ConnectBody {
  emailAddress: string;
  imapHost: string;
  imapPort: number;
  useTls: boolean;
  username: string;
  password: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Nicht angemeldet.' }, 401);

  let body: ConnectBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
  }

  const { emailAddress, imapHost, imapPort, useTls, username, password } = body;
  if (!emailAddress || !imapHost || !imapPort || !username || !password) {
    return jsonResponse({ error: 'Bitte alle Felder ausfüllen.' }, 400);
  }

  const client = createImapClient({ host: imapHost, port: imapPort, secure: useTls, username, password });

  try {
    await client.connect();
    await client.logout();
  } catch (err) {
    return jsonResponse({ error: `Verbindung fehlgeschlagen: ${(err as Error).message}` }, 400);
  }

  const passwordEncrypted = await encryptSecret(password);
  const admin = getAdminClient();

  const { data, error } = await admin
    .from('imap_accounts')
    .insert({
      user_id: user.id,
      email_address: emailAddress,
      imap_host: imapHost,
      imap_port: imapPort,
      use_tls: useTls,
      username,
      password_encrypted: passwordEncrypted,
    })
    .select('id')
    .single();

  if (error) {
    return jsonResponse({ error: `Konnte Konto nicht speichern: ${error.message}` }, 500);
  }

  return jsonResponse({ accountId: data.id });
});
