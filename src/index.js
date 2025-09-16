/*
### Zweck: Einstiegspunkt – erstellt den Client, lädt Commands/Events und loggt den Bot ein.
*/
import { Client, GatewayIntentBits } from 'discord.js';
import path from 'node:path';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';
import { logger } from './util/logger.js';

if (!process.env.TOKEN) {
  logger.error('[start] TOKEN fehlt – Start abgebrochen.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, // Presence-Intent im Dev-Portal aktivieren
    GatewayIntentBits.GuildMessages, // Kein Message-Content-Intent nötig
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const shutdown = (code = 0) => {
  logger.info('[beenden] Fahre herunter…');
  client.destroy().finally(() => process.exit(code));
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('unhandledRejection', (err) => {
  logger.error('[fehler] Unbehandelte Ausnahme:', err);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  logger.error('[fehler] Unbehandelte Ausnahme:', err);
  shutdown(1);
});

logger.info('[start] Starte…');
await commandLoader(client);
const eventsDir = process.env.EVENTS_DIR
  ? path.resolve(process.cwd(), process.env.EVENTS_DIR)
  : undefined;
await eventLoader(client, eventsDir);

await client.login(process.env.TOKEN);
