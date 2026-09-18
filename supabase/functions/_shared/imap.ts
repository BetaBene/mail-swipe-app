import { ImapFlow } from 'npm:imapflow@1';

export interface ImapCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export function createImapClient(creds: ImapCredentials): ImapFlow {
  return new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: { user: creds.username, pass: creds.password },
    logger: false,
  });
}

export type FolderKind = 'trash' | 'junk' | 'archive';

const SPECIAL_USE_FLAG: Record<FolderKind, string> = {
  trash: '\\Trash',
  junk: '\\Junk',
  archive: '\\Archive',
};

// Common folder names across German (GMX/Web.de), English (Gmail/generic)
// and Outlook mailboxes, used as a fallback when the server doesn't
// advertise RFC 6154 SPECIAL-USE attributes.
const NAME_CANDIDATES: Record<FolderKind, string[]> = {
  trash: ['Trash', 'Deleted Items', 'Papierkorb', 'INBOX.Trash', 'Gelöschte Objekte'],
  junk: ['Junk', 'Spam', 'Junk-E-Mail', 'INBOX.Junk'],
  archive: ['Archive', 'Archiv', 'All Mail', 'INBOX.Archive'],
};

export async function resolveFolder(client: ImapFlow, kind: FolderKind): Promise<string | null> {
  const list = await client.list();

  const bySpecialUse = list.find((box) => box.specialUse === SPECIAL_USE_FLAG[kind]);
  if (bySpecialUse) return bySpecialUse.path;

  const candidateSet = new Set(NAME_CANDIDATES[kind].map((n) => n.toLowerCase()));
  const byName = list.find((box) => candidateSet.has(box.name.toLowerCase()));
  return byName?.path ?? null;
}

export function extractSnippet(text: string | undefined, maxLength = 200): string {
  if (!text) return '';
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > maxLength ? `${collapsed.slice(0, maxLength)}…` : collapsed;
}
