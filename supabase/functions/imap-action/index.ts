import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { decryptSecret } from '../_shared/crypto.ts';
import { createImapClient, resolveFolder } from '../_shared/imap.ts';

type SwipeAction = 'keep' | 'archive' | 'delete' | 'spam';

interface ActionBody {
  emailId: string;
  action: SwipeAction;
}

const VALID_ACTIONS: SwipeAction[] = ['keep', 'archive', 'delete', 'spam'];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Nicht angemeldet.' }, 401);

  let body: ActionBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
  }

  if (!body.emailId || !VALID_ACTIONS.includes(body.action)) {
    return jsonResponse({ error: 'Ungültige Aktion.' }, 400);
  }

  const admin = getAdminClient();

  const { data: email, error: emailError } = await admin
    .from('cached_emails')
    .select('*')
    .eq('id', body.emailId)
    .eq('user_id', user.id)
    .single();

  if (emailError || !email) {
    return jsonResponse({ error: 'E-Mail nicht gefunden.' }, 404);
  }

  const { data: account, error: accountError } = await admin
    .from('imap_accounts')
    .select('*')
    .eq('id', email.account_id)
    .single();

  if (accountError || !account) {
    return jsonResponse({ error: 'Postfach nicht gefunden.' }, 404);
  }

  const password = await decryptSecret(account.password_encrypted);
  const client = createImapClient({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.use_tls,
    username: account.username,
    password,
  });

  try {
    await client.connect();
    await client.mailboxOpen(email.folder, { readOnly: false });

    if (body.action === 'keep') {
      await client.messageFlagsAdd({ uid: email.uid }, ['\\Seen']);
    } else {
      const kind = body.action === 'archive' ? 'archive' : body.action === 'spam' ? 'junk' : 'trash';
      const targetFolder = await resolveFolder(client, kind);

      if (targetFolder) {
        await client.messageMove({ uid: email.uid }, targetFolder);
      } else {
        // No matching special folder on this server: fall back to marking
        // \Deleted and expunging so the swipe still has an effect.
        await client.messageFlagsAdd({ uid: email.uid }, ['\\Deleted']);
        await client.messageDelete({ uid: email.uid });
      }
    }

    await client.logout();
  } catch (err) {
    try {
      await client.logout();
    } catch {
      // ignore
    }
    return jsonResponse({ error: `IMAP-Fehler: ${(err as Error).message}` }, 502);
  }

  await admin.from('cached_emails').update({ swiped: true }).eq('id', email.id);
  await admin.from('swipe_actions').insert({ user_id: user.id, email_id: email.id, action: body.action });

  const { data: stats, error: statsError } = await admin.rpc('apply_swipe_stats', {
    p_user_id: user.id,
    p_action: body.action,
    p_size_bytes: email.size_bytes,
  });

  if (statsError) {
    return jsonResponse({ ok: true, stats: null, warning: statsError.message });
  }

  return jsonResponse({ ok: true, stats });
});
