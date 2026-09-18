import { supabase } from '../supabase';
import type { ImapAccountInput, MailCard, SwipeAction } from '../types';

export async function connectImapAccount(input: ImapAccountInput): Promise<{ accountId: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('imap-connect', { body: input });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { accountId: data.accountId as string };
}

export async function syncMailbox(accountId: string, folder = 'INBOX', limit = 25): Promise<{ cards: MailCard[] } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('imap-sync', {
    body: { accountId, folder, limit },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error };
  return { cards: (data?.emails ?? []) as MailCard[] };
}

export async function submitSwipeAction(cardId: string, action: SwipeAction) {
  const { data, error } = await supabase.functions.invoke('imap-action', {
    body: { emailId: cardId, action },
  });
  if (error) return { error: error.message };
  if (data?.error) return { error: data.error as string };
  return { ok: true as const, stats: data?.stats };
}
