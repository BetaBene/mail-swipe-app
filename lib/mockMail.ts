import type { MailCard } from './types';

const senders = [
  ['Newsletter Team', 'news@shopdeals.example'],
  ['LinkedIn', 'notifications@linkedin.example'],
  ['Oma', 'oma@web-mail.example'],
  ['Amazon', 'versand@amazon.example'],
  ['Spotify', 'no-reply@spotify.example'],
  ['Bank', 'sicherheit@meinebank.example'],
  ['Chef', 'chef@firma.example'],
  ['Zalando', 'newsletter@zalando.example'],
  ['Fitnessstudio', 'info@fitclub.example'],
  ['Steuerberater', 'kanzlei@stb-mueller.example'],
];

const subjects = [
  'Deine Bestellung ist unterwegs',
  '70% Rabatt nur heute!',
  'Neue Kontaktanfrage',
  'Wie war dein letzter Kauf?',
  'Erinnerung: Termin morgen 10 Uhr',
  'Deine Rechnung für September',
  'Wir vermissen dich',
  '3 neue Jobangebote für dich',
  'Sicherheitswarnung: neue Anmeldung erkannt',
  'Willkommen zurück!',
];

const snippets = [
  'Vielen Dank für deine Bestellung, hier sind die Details zur Sendungsverfolgung...',
  'Nur für kurze Zeit: Sichere dir jetzt exklusive Rabatte auf ausgewählte Artikel...',
  'Hallo, ich wollte kurz nachfragen, ob wir den Termin diese Woche...',
  'Deine monatliche Zusammenfassung ist da. Sieh dir an, was du verpasst hast...',
  'Diese E-Mail wurde automatisch generiert. Bitte nicht direkt antworten...',
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateMockMail(count: number, accountId = 'mock-account'): MailCard[] {
  return Array.from({ length: count }).map((_, i) => {
    const [fromName, fromAddress] = randomFrom(senders);
    const daysAgo = Math.floor(Math.random() * 60);
    const receivedAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: `mock-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      accountId,
      uid: 1000 + i,
      folder: 'INBOX',
      fromName,
      fromAddress,
      subject: randomFrom(subjects),
      snippet: randomFrom(snippets),
      receivedAt,
      sizeBytes: Math.floor(Math.random() * 4_000_000) + 20_000,
      isUnread: Math.random() > 0.4,
    };
  });
}
