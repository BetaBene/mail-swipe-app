# Handoff-Dokument: MailSwipe Supabase-Setup & Tests

Dieses Dokument fasst zusammen, was in einer früheren Claude-Code-Session am
Backend dieses Projekts eingerichtet und getestet wurde. Gedacht als
Kontext für eine andere KI-Session (oder Person), die an diesem Projekt
weiterarbeitet.

## Projekt in Kürze

MailSwipe – Tinder-artige App zum Aufräumen von E-Mail-Postfächern per
Wischgeste (rechts=behalten, links=löschen, oben=archivieren,
unten=spam). Stack: Expo/React Native (SDK 57) + Supabase (Postgres,
Auth, Edge Functions). Details zu Architektur und Ordnerstruktur stehen
in `README.md` – das hier ist bewusst kein Duplikat davon, sondern
Kontext zum **aktuellen Live-Zustand des Supabase-Backends** und zu den
**durchgeführten Tests**.

## Supabase-Projekt (live, produktiv)

| | |
|---|---|
| Organisation | `MailSwipe` (Slug/ID: `maffqsmyrjnyhrkfhydd`) |
| Projekt | `mailswipe` |
| Project-Ref | `ahizgqpbdwamvywysqmg` |
| Region | `eu-central-1` (Frankfurt) |
| Projekt-URL | `https://ahizgqpbdwamvywysqmg.supabase.co` |
| Anon-Key | in `.env` (siehe unten) – öffentlich nutzbar, per RLS abgesichert |

Ein zweites, beim Anlegen der Organisation automatisch erstelltes
Default-Projekt (`uxxcxogiagiwqvgtakiw`, Irland) wurde vom User bereits
gelöscht.

### Was eingerichtet wurde

1. **DB-Schema** (`supabase/migrations/0001_init.sql`,
   `0002_stats_function.sql`) ist vollständig angewendet: Tabellen
   `imap_accounts`, `cached_emails`, `swipe_actions`, `user_stats` +
   RPC-Funktion `apply_swipe_stats`.
2. **Secret** `MAILSWIPE_ENCRYPTION_KEY` (32 zufällige Bytes, base64) ist
   als Edge-Function-Secret gesetzt – verschlüsselt die IMAP-Passwörter
   in `imap_accounts.password_encrypted` (AES-256-GCM, siehe
   `supabase/functions/_shared/crypto.ts`).
3. **Edge Functions** `imap-connect`, `imap-sync`, `imap-action` sind
   deployed und wurden gegen echte IMAP-Server erfolgreich getestet
   (siehe Testergebnisse unten).
4. **`.env`** existiert lokal (gitignored, nicht im Repo) mit
   `EXPO_PUBLIC_SUPABASE_URL` und `EXPO_PUBLIC_SUPABASE_ANON_KEY` für
   das obige Projekt. Falls eine neue Session/Maschine diese Datei
   braucht: `cp .env.example .env` und Werte aus Supabase-Dashboard
   (Project Settings → API) oder von einer Person mit Zugriff auf die
   ursprüngliche `.env` eintragen.

### ⚠️ Wichtige Besonderheit: `supabase db push` funktioniert nicht in Sandbox-Agent-Umgebungen

In der Umgebung, in der dieses Setup gemacht wurde (Claude Code
Remote/Cloud-Container mit HTTPS-Only-Egress-Proxy), schlägt
`supabase db push` fehl, weil es eine rohe TCP/Postgres-Verbindung
(Port 5432/6543) braucht – solche Sandbox-Umgebungen erlauben oft nur
HTTPS zu einer Allowlist von Hosts. Fehlerbild: `LegacyDbConnectError:
Connection timed out`.

**Workaround, der hier verwendet wurde:** Migrations-SQL direkt per
HTTPS über die Supabase Management API ausgeführt
(`POST /v1/projects/{ref}/database/query` mit einem Personal Access
Token als Bearer-Token), danach die Versionen manuell in
`supabase_migrations.schema_migrations` eingetragen, damit ein
späteres reguläres `supabase db push` (von einer normalen Maschine mit
vollem Netzwerkzugriff aus) sie nicht doppelt anwendet.

**Für neue Migrationen künftig:**
- Von einer normalen Entwickler-Maschine (kein Sandbox-Netzwerk-Proxy):
  ganz normal `npx supabase link --project-ref ahizgqpbdwamvywysqmg` +
  `npx supabase db push`.
- In einer ähnlich eingeschränkten Sandbox: den obigen
  Management-API-Workaround wiederholen (SQL-Datei einlesen, als
  `{"query": "..."}` JSON per curl an
  `https://api.supabase.com/v1/projects/ahizgqpbdwamvywysqmg/database/query`
  schicken, danach Version in `supabase_migrations.schema_migrations`
  eintragen).

### Zugangsdaten / Secrets – Status

- Der **Personal Access Token (PAT)**, der für dieses Setup verwendet
  wurde, ist **bereits vom User revoked** (bewusst, aus
  Sicherheitsgründen nach Abschluss des Setups). Für weitere
  Management-API- oder CLI-Aktionen (Migrationen, Secrets, Function-
  Deploys, Projekt-Verwaltung) muss der Projekt-Owner im
  Supabase-Dashboard unter Account → Access Tokens einen **neuen PAT**
  erzeugen.
- Der **`service_role`-Key** wird bewusst **nicht** in diesem Dokument
  oder sonst irgendwo im Repo gespeichert (er hebelt RLS komplett aus).
  Bei Bedarf im Supabase-Dashboard unter Project Settings → API
  abrufen. **Niemals committen.**
- Der **Anon-Key** ist unkritisch (siehe README: bewusst für den
  Client gedacht, durch RLS abgesichert) und steht in `.env`.

## Durchgeführte Tests (alle erfolgreich)

Alle Tests wurden über direkte HTTPS-Aufrufe gegen die Supabase-Auth-
API bzw. die Edge Functions durchgeführt (curl) sowie zusätzlich einmal
vollständig über die echte App-UI (Playwright + headless Chromium,
`npm run web`).

1. **Registrierung** (`POST /auth/v1/signup`) – funktioniert. Supabase
   verlangt danach **E-Mail-Bestätigung** (Standard-Verhalten,
   `email_not_confirmed`-Fehler beim Login-Versuch vor Bestätigung).
2. **Login** (`POST /auth/v1/token?grant_type=password`) – funktioniert
   nach Bestätigung.
3. **`imap-connect`** – gegen echte Server getestet:
   - Gmail (`imap.gmail.com:993`) mit absichtlich falschem Passwort →
     sauberer `400`-Fehler (`Verbindung fehlgeschlagen: Command
     failed`). Beweist: echte TCP/TLS-Verbindung + IMAP-Auth-Handling
     funktionieren.
   - GMX (`imap.gmx.net:993`) mit falschem Passwort → gleiches
     Verhalten. Einmalig gab es beim allerersten Aufruf nach dem
     Deploy einen `503`-Cold-Start-Ausreißer (leerer Body) – bei allen
     Folgeversuchen sauber `400`. Kein wiederkehrendes Problem.
   - **web.de mit echten, gültigen Zugangsdaten** (vom User bereit-
     gestelltes Test-Postfach `swipetest@web.de`) → zunächst `400`
     (Auth-Fehler), weil IMAP-Zugriff im web.de-Konto nicht aktiviert
     war. Nach Aktivierung durch den User (Einstellungen →
     POP3/IMAP) und einmaligem Webmail-Login: **erfolgreiche
     Verbindung** (`200`, `accountId` zurückgegeben).
4. **`imap-sync`** – hat die echte Willkommensmail aus dem web.de-
   Posteingang korrekt geladen (Absender, Betreff, Snippet, Größe,
   Datum).
5. **`imap-action`** (Aktion `keep`) – hat serverseitig das `\Seen`-
   Flag auf dem echten IMAP-Server gesetzt, `cached_emails.swiped`
   aktualisiert, einen `swipe_actions`-Eintrag angelegt und über die
   RPC `apply_swipe_stats` Streak/Zähler korrekt berechnet.
6. **Vollständiger UI-Flow** (Login → Onboarding „Postfach verbinden"
   mit Preset „Web.de" → automatischer Redirect zu `/swipe` mit der
   echten synchronisierten Mail) – per Screenshot bestätigt, keine
   Konsolenfehler.

Alle für die Tests angelegten Test-User/-Konten wurden danach wieder
gelöscht (kaskadierend über `ON DELETE CASCADE`), das Projekt ist
sauber.

### Offener Punkt

Ein **positiver Login-Test mit einem echten, für den User relevanten
Postfach über die App selbst** (nicht nur API) mit anschließendem
mehrfachem Wischen wurde nicht durchgeführt – das kann der User selbst
im Browser machen (siehe „Lokal starten" unten). Das test-Postfach
`swipetest@web.de` (Passwort wurde im Chat geteilt) sollte der User
rotieren oder löschen, sobald es nicht mehr gebraucht wird.

## Bekannte Grenzen (aus README, weiterhin gültig)

- `imap-sync` lädt aktuell den kompletten `TEXT`-Bodyteil und kürzt
  clientseitig – für sehr große Mails wäre ein partieller IMAP-Fetch
  effizienter.
- Ordner-Erkennung (Papierkorb/Archiv/Spam) nutzt zuerst RFC-6154-
  SPECIAL-USE-Flags, sonst eine DE/EN-Namens-Fallback-Liste
  (`supabase/functions/_shared/imap.ts`).
- Kein Offline-Cache über die aktuelle Karten-Batch hinaus.
- Push-Benachrichtigungen sind noch nicht implementiert.

## Lokal starten (für eigene Tests im Browser)

```bash
git clone https://github.com/BetaBene/mail-swipe-app.git
cd mail-swipe-app
git checkout claude/epic-johnson-q8ahck
cp .env.example .env   # dann URL + Anon-Key oben eintragen
npm install
npm run web
```

Login-Screen hat einen „Demo-Modus starten"-Button (kein Backend
nötig). Für den echten Flow: registrieren (E-Mail muss real
empfangbar sein, um den Bestätigungslink zu klicken), dann im
Onboarding ein echtes IMAP-Postfach verbinden.

## Für eine neue Session/KI: womit typischerweise weitergearbeitet wird

- Migrationen ändern/hinzufügen → neue Datei unter
  `supabase/migrations/`, dann Deploy-Workaround oben beachten, falls
  in ähnlicher Sandbox gearbeitet wird.
- Edge-Function-Code ändern → `supabase/functions/<name>/index.ts`,
  danach `npx supabase functions deploy <name>` (braucht gültigen
  `SUPABASE_ACCESS_TOKEN`, siehe oben – neuen PAT vom User anfordern
  falls keiner vorhanden).
- Client-/UI-Code → `app/`, `components/`, `lib/`.
- Für App-Tests im Sandbox-Container: `npm run web` + Playwright mit
  `executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'`
  und `--ignore-certificate-errors` (nötig wegen des lokalen
  TLS-Proxys in solchen Sandbox-Umgebungen, kein App-Problem).
