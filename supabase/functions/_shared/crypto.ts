// Symmetric encryption for IMAP passwords at rest, using AES-256-GCM with a
// server-only key (MAILSWIPE_ENCRYPTION_KEY, 32 random bytes, base64
// encoded). Ciphertext is stored as base64(iv || ciphertext+tag) in the
// imap_accounts.password_encrypted text column.

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('MAILSWIPE_ENCRYPTION_KEY');
  if (!secret) {
    throw new Error('MAILSWIPE_ENCRYPTION_KEY is not set');
  }
  const rawKey = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0));
  if (rawKey.length !== 32) {
    throw new Error('MAILSWIPE_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

export async function encryptSecret(plainText: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plainText);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded));
  const combined = new Uint8Array(iv.length + ciphertext.length);
  combined.set(iv, 0);
  combined.set(ciphertext, iv.length);
  return toBase64(combined);
}

export async function decryptSecret(stored: string): Promise<string> {
  const key = await getKey();
  const combined = fromBase64(stored);
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuffer);
}
