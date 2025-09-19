/*
### Zweck: Einstiegspunkt – erstellt den Client, lädt Commands/Events und loggt den Bot ein.
*/
import { Client, GatewayIntentBits } from 'discord.js';
import path from 'node:path';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';
import { logger } from './util/logger.js';
import { setupDiscordLogging } from './util/discordLogger.js';
import { getLogChannelIds } from './util/logging/config.js';

const startLogger = logger.withPrefix('start');
const shutdownLogger = logger.withPrefix('beenden');
const errorLogger = logger.withPrefix('fehler');

if (!process.env.TOKEN) {
  startLogger.error('TOKEN fehlt – Start abgebrochen.');
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

const logChannelIds = getLogChannelIds();
setupDiscordLogging(client, logChannelIds);

const shutdown = (code = 0) => {
  shutdownLogger.info('Fahre herunter…');
  client.destroy().finally(() => process.exit(code));
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('unhandledRejection', (err) => {
  errorLogger.error('Unbehandelte Ausnahme:', err);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  errorLogger.error('Unbehandelte Ausnahme:', err);
  shutdown(1);
});

startLogger.info('Starte…');
await commandLoader(client);
const eventsDir = process.env.EVENTS_DIR
  ? path.resolve(process.cwd(), process.env.EVENTS_DIR)
  : undefined;
await eventLoader(client, eventsDir);

await client.login(process.env.TOKEN);
