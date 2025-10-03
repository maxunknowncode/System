# The Core System — Discord Bot

## Überblick
- Vollständig in Node.js (ESM) implementierter Discord-Bot mit modularem Aufbau.
- Enthält geprüfte `node_modules/`, wie vom Projekt gefordert (keine `.env`- oder `.gitignore`-Dateien).
- Lädt Slash-Commands und Event-Handler dynamisch und verwaltet zahlreiche Server-Systeme (Verify, Regeln, Tickets, Teamliste, Voice-Statistiken usw.).

## Voraussetzungen
- **Node.js:** >= 20 < 21 (`package.json` → `"engines": { "node": ">=20 <21" }`).
- **Umgebungsvariablen** (da keine `.env` genutzt wird, im Terminal setzen oder über einen Process Manager):
  - `TOKEN` – Bot-Token (Pflicht für Start & Command-Registrierung).
  - `CLIENT_ID` – Application-/Client-ID (für `register-guild-commands.js`).
  - `GUILD_ID` – Ziel-Guild für Command-Registrierung & optionale Voice-Stats (siehe unten).
  - Optional: `LOG_LEVEL` (`debug` | `info` | `warn` | `error`, Standard `info`).

Beispiel (macOS/Linux):
```bash
export TOKEN="<bot-token>"
export CLIENT_ID="<application-id>"
export GUILD_ID="<guild-id>"
```
Unter Windows (PowerShell):
```powershell
setx TOKEN "<bot-token>"
$env:TOKEN = "<bot-token>" # für die laufende Session
```

## Installation & Start
1. Repository klonen oder herunterladen.
2. **Optional** `npm install` ausführen (Abhängigkeiten sind bereits in `node_modules/` enthalten, können aber aktualisiert werden).
3. Bot starten:
   - Produktion: `npm start` (führt automatisch zuerst `npm run prestart` → `scripts/register-guild-commands.js` aus).
   - Entwicklung mit Autoreload: `npm run dev` (via `nodemon`).
4. Tests & Linting:
   - `npm test` (Vitest).
   - `npm run lint` (ESLint mit Projektregeln).

> Hinweis: Beim ersten Start registriert das Prestart-Skript alle Slash-Commands in der angegebenen Guild. Wird kein `CLIENT_ID`/`GUILD_ID` gesetzt, schlägt der Start fehl.

## Ordnerstruktur (Auszug)
```
src/
  commands/      # Slash-Commands (je Unterordner eine Definition)
  events/        # Event-Handler für Discord-Events
  loaders/       # Dynamische Loader für Commands & Events
  modules/       # Fachliche Systeme (Verify, Tickets, Teamliste …)
  util/          # Hilfsfunktionen (Logger, Embed-Konstanten)
scripts/         # CLI-Skripte (Slash-Command-Registrierung)
```

## Slash-Commands
| Name  | Datei                                | Beschreibung | Wichtige IDs/Details |
|-------|--------------------------------------|--------------|----------------------|
| `/ping` | `src/commands/ping/command.js` | Zeigt WebSocket-Ping, Roundtrip, Uptime und Serverzeit als Embed. | Nutzt Footer `The Core System` und Formatierung über `formatDuration`. |
| `/clear` | `src/commands/clear/command.js` | Löscht bis zu 100 Nachrichten im aktuellen Kanal. | Nur nutzbar für Rolleninhaber `ROLE_ID = 1363298860121985215`; sendet Erfolg/Fehler-Embeds. |

## Event-Listener
| Event | Datei | Zweck |
|-------|-------|-------|
| `ready` | `src/events/ready/handler.js` | Loggt Start, stellt Verify-, Regeln-, Teamlisten-, Ticket-Panel-Nachrichten sicher und startet Voice-Stats. |
| `interactionCreate` | `src/events/interactionCreate/handler.js` | Handhabt Sprach-/Verify-/Team-/Ticket-Buttons und führt Slash-Commands aus. |
| `guildMemberAdd` | `src/events/guildMemberAdd/handler.js` | Sendet Willkommens-Embed im Zielkanal. |
| `messageCreate` | `src/events/messageCreate/handler.js` | Fügt Vorschlagsreaktionen hinzu. |
| `voiceStateUpdate` | `src/events/voiceStateUpdate/handler.js` | Join-to-Create-System: erstellt/entfernt temporäre Voice-Channels. |

## Systeme & IDs
Nachfolgend sämtliche relevanten Konstanten (siehe `src/modules/**/config.js`). Passe die IDs bei Server-Änderungen direkt in diesen Dateien an.

### Verify-System (`src/modules/verify/*`)
- Kanal: `VERIFY_CHANNEL_ID = 1354914940611330239`
- (Optional) bestehende Nachricht: `VERIFY_MESSAGE_ID = 1412850918952669304`
- Rolle: `VERIFY_ROLE_ID = 1354909911691038862`
- Buttons:
  - `VERIFY_BUTTON_ID = "verify_action"`
  - Sprachwahl: `VERIFY_LANG_EN_ID = "verify_lang_en"`, `VERIFY_LANG_DE_ID = "verify_lang_de"`
- Standard-Sprache: Englisch (`VERIFY_DEFAULT_LANG = "en"`)
- Automatisches Zurücksetzen auf Englisch nach `VERIFY_RESET_MS = 300000` ms (5 Minuten).
- Emoji im Verify-Button: animiert `verify` (`id: 1355265228862001202`).

### Regelwerk (`src/modules/rules/*`)
- Kanal: `RULES_CHANNEL_ID = 1354914857538945205`
- Nachricht: `RULES_MESSAGE_ID = 1411308407088087050`
- Sprach-Buttons: `RULES_BUTTON_ID_EN = "rules_lang_en"`, `RULES_BUTTON_ID_DE = "rules_lang_de"`
- Standard-Sprache: Englisch (`RULES_DEFAULT_LANG = "en"`)
- Timeout zum Rücksetzen: `RULES_RESET_MS = 300000` ms.

### Teamliste (`src/modules/teamlist/*`)
- Kanal: `TEAM_CHANNEL_ID = 1364580010316529755`
- Nachricht: `TEAM_MESSAGE_ID = 1412111574268645386`
- Buttons: `TEAM_BUTTON_ID_EN = "team_lang_en"`, `TEAM_BUTTON_ID_DE = "team_lang_de"`
- Timeout: `TEAM_RESET_MS = 300000` ms.
- Rollenmatrix (`TEAM_ROLES`):

| Rollen-ID | EN Label | DE Label | Beschreibung (EN / DE) |
|-----------|----------|----------|-------------------------|
| 1354909215365534010 | Owner | Owner | Overall responsibility & final decisions / Gesamtverantwortung & finale Entscheidungen |
| 1354909233103245493 | Co. Owner | Co. Owner | Deputy lead — supports ownership and strategy / Stellvertretung — unterstützt Leitung & Strategie |
| 1354909289889796455 | Developer | Entwickler | Discord bot & core system / Discord-Bot & Core-System |
| 1392416721633149029 | Manager | Manager | Operations & team coordination / Betrieb & Team-Koordination |
| 1354909248752062656 | Assistant Manager | Assistant Manager | Assists management & scheduling / Unterstützt Management & Terminplanung |
| 1354909272760385709 | Assistant | Assistant | General support & user help / Allgemeiner Support & User-Hilfe |
| 1392416796912521316 | Helper | Helper | First-line support & guidance / Ersthilfe & Orientierung |

> Das Modul lädt bei Bedarf alle Guild-Mitglieder, um aktuelle Rolleninhaber zu listen (max. 30 pro Rolle).

### Ticketsystem (`src/modules/tickets/*`)
- Panel-Kanal: `TICKET_PANEL_CHANNEL_ID = 1354917224669773895`
- Panel-Nachricht: `TICKET_PANEL_MESSAGE_ID = 1413607006736220311`
- Kategorie aktiv: `TICKET_ACTIVE_CATEGORY_ID = 1357069606455345483`
- Kategorie Archiv: `TICKET_ARCHIVE_CATEGORY_ID = 1357069661505589268`
- Team-Rolle (sichtbar in Tickets): `TEAM_ROLE_ID = 1354916696527208693`
- Kanal-Präfix: `TICKET_CHANNEL_PREFIX = "ticket"`
- Dropdown (`StringSelectMenu`):
  - `MENU_CUSTOM_ID = "ticket_menu_single"`
  - Platzhalter: `MENU_PLACEHOLDER = "Select your ticket type."`
  - Optionen: `MENU_OPTION_EN` (🇺🇸 General Support) & `MENU_OPTION_DE` (🇩🇪 Allgemeiner Support)
- Button-IDs:
  - Claim: `BTN_CLAIM_ID = "ticket_claim"`
  - Close: `BTN_CLOSE_ID = "ticket_close"`, Bestätigung: `BTN_CLOSE_CONFIRM_ID = "ticket_close_confirm"`
  - Reopen: `BTN_REOPEN_ID = "ticket_reopen"`, Bestätigung: `BTN_REOPEN_CONFIRM_ID = "ticket_reopen_confirm"`
  - Delete: `BTN_DELETE_ID = "ticket_delete"`, Bestätigung: `BTN_DELETE_CONFIRM_ID = "ticket_delete_confirm"`
- Funktionen:
  - `openTicket` erstellt Kanäle mit individuellen Berechtigungen (User, Team, Bot) und pingt Team + Nutzer.
  - `setStatusPrefix` setzt Kanalpräfixe (`✅`, `🔴-`) je nach Status.
  - `handleTicketInteractions` steuert Anspruchnahme, Schließen/Archivieren, Wiederöffnen und Löschen.

### Vorschlags-Reaktionen (`src/modules/suggestions/config.js`)
- Channel: `SUGGESTIONS_CHANNEL_ID = 1398631546549833829`
- Emojis: `SUGGESTIONS_EMOJI_UP = ✅`, `SUGGESTIONS_EMOJI_DOWN = ❌`
- Bots ignorieren: `SUGGESTIONS_IGNORE_BOTS = true`

### Willkommen (`src/modules/welcome/config.js`)
- Willkommenskanal: `WELCOME_CHANNEL_ID = 1416434130312499322`
- Verweis auf Regeln: `RULES_CHANNEL_ID = 1354914857538945205`
- Thumbnail/Grafik: `WELCOME_IMAGE_URL` (Discord-CDN-Link)

### Join-to-Create (`src/modules/join2create/config.js`)
- Basis-Voice-Channel: `JOIN_TO_CREATE_CHANNEL_ID = 1362861795639038142`
- Event-Handler erstellt pro Join einen privaten Voice-Channel und löscht leere wieder.

### Voice-Statistiken (`src/modules/voiceStats/*`)
- Guild: optional `VOICESTATS_GUILD_ID = process.env.GUILD_ID` (sonst erste Guild).
- Mitglieder-Kanal: `MEMBERS_CHANNEL_ID = 1355272570848673895`
- Online-Kanal: `ONLINE_CHANNEL_ID = 1355272617791193389`
- Aktualisierungsintervall: `UPDATE_EVERY_MS = 300000` ms (5 Minuten)
- Als „online“ zählen Statuswerte in `ONLINE_STATUSES = ["online", "idle", "dnd"]`
- Erfordert Intents `GuildMembers`, `GuildPresences`, `GuildVoiceStates`.

### Weitere Hilfen
- `src/util/logging/logger.js` bietet einfachen konsolenbasierten Logger; steuerbar über `LOG_LEVEL`.
- `src/util/embeds/*` liefert wiederverwendbare Embed-Eigenschaften (Farbe, Footer, Autoren-Label und Icon).
- `scripts/cleanup-commands.js` ist als Platzhalter für zukünftiges Entfernen nicht mehr genutzter Commands vorgesehen.

## Tests & Qualitätssicherung
- **Logger-Test:** `src/util/logger.test.js` verifiziert die Einhaltung des `LOG_LEVEL`.
- Empfohlener Workflow: `npm run lint` → `npm test` → `npm start`.

## Wartung & Anpassung
- Bei Änderung von Channel-/Rollen-IDs oder neuen Buttons die jeweiligen `config.js`-Dateien aktualisieren.
- Nach ID-Anpassungen `npm start` (bzw. `npm run prestart`) ausführen, um Commands neu zu registrieren.
- Die Einbettungen sind zweisprachig (EN/DE) aufgebaut; Inhalte lassen sich in den entsprechenden `embed.js`-Dateien ändern.

## Hinweis zu `node_modules/`
`node_modules/` ist bewusst eingecheckt und sollte im Repo verbleiben, solange dieser Workflow gewünscht ist. Beim Updaten oder Hinzufügen neuer Pakete stets auf die resultierende Repo-Größe achten.
