# MailSwipe

Überfülltes E-Mail-Postfach spielerisch ausmisten – Tinder-Prinzip für den Posteingang.
Nach rechts wischen = behalten, nach links = löschen, nach oben = archivieren, nach unten = Spam.

## Stack

- **App:** React Native mit Expo (SDK 57, Router, TypeScript), Gesten über
  `react-native-gesture-handler` + `react-native-reanimated`, State über `zustand`.
- **Backend:** Supabase (Postgres + Auth + Edge Functions als BaaS). Die
  Edge Functions übernehmen die eigentliche IMAP-Kommunikation server-seitig,
  damit IMAP-Zugangsdaten nie im Klartext auf dem Client landen und keine
  rohen TCP/TLS-Sockets im React-Native-Client nötig sind.
- **E-Mail-Zugang (MVP):** generisches IMAP – funktioniert mit GMX, Web.de,
  Gmail (mit App-Passwort), Outlook/Office365 und den meisten anderen
  Anbietern, die IMAP unterstützen.

## Projektstruktur

```
app/                      Expo Router Screens
  (auth)/login.tsx         Login + Demo-Modus-Einstieg
  (auth)/signup.tsx        Registrierung
  onboarding/connect-account.tsx   IMAP-Konto verbinden
  (app)/swipe.tsx           Swipe-Deck (Haupt-Screen)
  (app)/stats.tsx           Statistik / Gamification
  (app)/settings.tsx        Konto, Abmelden, Postfach wechseln
components/
  SwipeDeck.tsx             Gesten-Logik (Pan-Gesture, 4 Richtungen)
  MailCardView.tsx          Kartenlayout (Absender, Betreff, Snippet)
  SwipeButtons.tsx          Alternative Buttons zu den Wischgesten
  ProgressHeader.tsx        Tagesziel + Streak-Anzeige
lib/
  store/useMailStore.ts     Swipe-Queue, Stats, Undo (zustand)
  store/useAuthStore.ts     Supabase-Auth-Session
  api/mail.ts               Aufrufe der Supabase Edge Functions
  mockMail.ts                Beispiel-E-Mails für den Demo-Modus
supabase/
  migrations/                DB-Schema (Postgres)
  functions/
    imap-connect/             Testet IMAP-Login, legt Konto verschlüsselt an
    imap-sync/                Holt neue E-Mail-Header/Snippets per IMAP
    imap-action/               Führt Swipe-Aktion serverseitig auf IMAP aus
```

## Wie die Wischgesten funktionieren

Jede Karte reagiert auf `Gesture.Pan` (react-native-gesture-handler) und wird
per Reanimated live mitbewegt/-rotiert. Beim Loslassen entscheidet die
Richtung + Distanz über die Aktion:

| Geste            | Aktion     | IMAP-Effekt                          |
|-------------------|-----------|----------------------------------------|
| nach rechts        | Behalten  | nur `\Seen`-Flag setzen, bleibt liegen |
| nach links         | Löschen   | Verschieben nach Papierkorb/Trash      |
| nach oben          | Archivieren | Verschieben nach Archiv                |
| nach unten         | Spam      | Verschieben nach Spam/Junk             |

Die gleichen vier Buttons unter dem Deck lösen programmatisch dieselbe
Animation aus (`SwipeDeckHandle.swipeTop(action)`), damit die App auch ohne
Touch-Gesten (z. B. am Desktop/Web zum Testen) bedienbar ist.

## App lokal starten

```bash
npm install
npm run web      # oder: npm run android / npm run ios
```

Ohne konfiguriertes Supabase-Projekt startet die App trotzdem: Auf dem
Login-Screen gibt es einen **"Demo-Modus starten"**-Button, der das komplette
Swipe-Erlebnis mit generierten Beispiel-E-Mails zeigt (kein Netzwerk nötig).

## Supabase-Projekt einrichten (für echten IMAP-Betrieb)

1. Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Datenbank-Schema anwenden:
   ```bash
   npx supabase link --project-ref <dein-projekt-ref>
   npx supabase db push
   ```
   (führt die Dateien in `supabase/migrations/` aus)
3. Secrets für die Edge Functions setzen:
   ```bash
   # 32 zufällige Bytes, base64-kodiert – NIE committen
   openssl rand -base64 32
   npx supabase secrets set MAILSWIPE_ENCRYPTION_KEY=<obiger-wert>
   ```
4. Edge Functions deployen:
   ```bash
   npx supabase functions deploy imap-connect
   npx supabase functions deploy imap-sync
   npx supabase functions deploy imap-action
   ```
5. `.env` aus `.env.example` erstellen und mit den Werten aus
   *Project Settings → API* füllen (`EXPO_PUBLIC_SUPABASE_URL`,
   `EXPO_PUBLIC_SUPABASE_ANON_KEY`).
6. App neu starten – jetzt sind Registrierung/Login aktiv, und im
   Onboarding kann ein echtes IMAP-Postfach verbunden werden.

### Warum IMAP-Zugangsdaten sicher sind

- `imap_accounts` hat Row Level Security **ohne** Policies für
  `anon`/`authenticated` – nur der `service_role`-Key (den ausschließlich
  die Edge Functions besitzen) kann darauf zugreifen.
- Das Passwort wird mit AES-256-GCM verschlüsselt gespeichert
  (`supabase/functions/_shared/crypto.ts`), der Schlüssel
  (`MAILSWIPE_ENCRYPTION_KEY`) existiert nur als Edge-Function-Secret.
- Der Client spricht nie direkt mit dem IMAP-Server; er ruft nur die drei
  Edge Functions über die normale Supabase-Auth-Session auf.

### IMAP-Zugangsdaten je Anbieter

Für Gmail und Outlook/Office365 wird in der Regel ein **App-Passwort**
statt des normalen Kontopassworts benötigt (2FA muss aktiviert sein). Bei
GMX/Web.de reicht meist das normale Postfach-Passwort, sofern "IMAP-Zugriff"
in den Kontoeinstellungen aktiviert ist. Presets für Server/Port sind im
Onboarding-Screen hinterlegt.

## Bekannte Grenzen / nächste Schritte

- `imap-sync` lädt für die Vorschau aktuell den `TEXT`-Bodyteil komplett und
  kürzt ihn clientseitig auf 200 Zeichen – für sehr große Mails ist ein
  partieller IMAP-Fetch (Byte-Range) noch effizienter.
- Ordner-Erkennung für Papierkorb/Archiv/Spam nutzt zuerst
  RFC-6154-SPECIAL-USE-Flags, sonst eine Namens-Fallback-Liste (DE/EN). Bei
  exotischen Anbietern kann das manuell erweitert werden
  (`supabase/functions/_shared/imap.ts`).
- Es gibt noch keinen Offline-Cache/Preload über die aktuelle Karten-Batch
  hinaus – `refillIfLow()` holt bei < 5 verbleibenden Karten automatisch
  nach.
- Push-Benachrichtigungen für "dein Postfach wartet" (Reminder-Charakter)
  sind als nächster Gamification-Schritt naheliegend.
