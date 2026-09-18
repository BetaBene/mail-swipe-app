import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getAdminClient, getUserFromRequest } from '../_shared/supabaseAdmin.ts';
import { decryptSecret } from '../_shared/crypto.ts';
import { createImapClient, extractSnippet } from '../_shared/imap.ts';

interface SyncBody {
  accountId: string;
  folder?: string;
  limit?: number;
}

interface MailCardRow {
  id: string;
  accountId: string;
  uid: number;
  folder: string;
  fromName: string;
  fromAddress: string;
  subject: string;
  snippet: string;
  receivedAt: string;
  sizeBytes: number;
  isUnread: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const user = await getUserFromRequest(req);
  if (!user) return jsonResponse({ error: 'Nicht angemeldet.' }, 401);

  let body: SyncBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'Ungültige Anfrage.' }, 400);
  }

  const folder = body.folder ?? 'INBOX';
  const limit = Math.min(Math.max(body.limit ?? 25, 1), 100);
  const admin = getAdminClient();

  const { data: account, error: accountError } = await admin
    .from('imap_accounts')
    .select('*')
    .eq('id', body.accountId)
    .eq('user_id', user.id)
    .single();

  if (accountError || !account) {
    return jsonResponse({ error: 'Postfach nicht gefunden.' }, 404);
  }

  const { data: existing } = await admin
    .from('cached_emails')
    .select('uid')
    .eq('account_id', account.id)
    .eq('folder', folder)
    .order('uid', { ascending: false })
    .limit(1);

  const highestKnownUid = existing?.[0]?.uid ?? 0;

  const password = await decryptSecret(account.password_encrypted);
  const client = createImapClient({
    host: account.imap_host,
    port: account.imap_port,
    secure: account.use_tls,
    username: account.username,
    password,
  });

  const newCards: MailCardRow[] = [];

  try {
    await client.connect();
    const mailbox = await client.mailboxOpen(folder, { readOnly: true });

    let range: string;
    if (highestKnownUid > 0) {
      range = `${highestKnownUid + 1}:*`;
    } else {
      const startSeq = Math.max(1, mailbox.exists - limit + 1);
      range = `${startSeq}:${mailbox.exists}`;
    }

    if (mailbox.exists === 0) {
      await client.logout();
      return jsonResponse({ emails: [] });
    }

    const rowsToInsert: Record<string, unknown>[] = [];

    for await (const message of client.fetch(
      range,
      { envelope: true, flags: true, size: true, uid: true, bodyParts: ['TEXT'] },
      { uid: highestKnownUid > 0 }
    )) {
      if (highestKnownUid > 0 && message.uid <= highestKnownUid) continue;

      const from = message.envelope?.from?.[0];
      const textPart = message.bodyParts?.get('TEXT');
      const snippet = extractSnippet(textPart ? new TextDecoder().decode(textPart) : undefined);

      rowsToInsert.push({
        user_id: user.id,
        account_id: account.id,
        uid: message.uid,
        folder,
        from_name: from?.name || from?.address || 'Unbekannt',
        from_address: from?.address || '',
        subject: message.envelope?.subject || '(kein Betreff)',
        snippet,
        received_at: message.envelope?.date ?? null,
        size_bytes: message.size ?? 0,
        is_unread: !(message.flags?.has('\\Seen') ?? false),
        swiped: false,
      });
    }

    await client.logout();

    if (rowsToInsert.length > 0) {
      const { data: inserted, error: insertError } = await admin
        .from('cached_emails')
        .upsert(rowsToInsert, { onConflict: 'account_id,folder,uid', ignoreDuplicates: true })
        .select('*');

      if (insertError) {
        return jsonResponse({ error: `Sync-Fehler: ${insertError.message}` }, 500);
      }

      const sorted = (inserted ?? []).sort(
        (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
      );

      for (const row of sorted) {
        newCards.push({
          id: row.id,
          accountId: row.account_id,
          uid: row.uid,
          folder: row.folder,
          fromName: row.from_name,
          fromAddress: row.from_address,
          subject: row.subject,
          snippet: row.snippet,
          receivedAt: row.received_at,
          sizeBytes: row.size_bytes,
          isUnread: row.is_unread,
        });
      }
    }
  } catch (err) {
    try {
      await client.logout();
    } catch {
      // ignore
    }
    return jsonResponse({ error: `IMAP-Fehler: ${(err as Error).message}` }, 502);
  }

  return jsonResponse({ emails: newCards });
});
