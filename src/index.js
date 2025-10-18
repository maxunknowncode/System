/*
### Zweck: Einstiegspunkt – erstellt den Client, lädt Commands/Events und loggt den Bot ein.
*/
import { randomUUID } from 'node:crypto';
import { Client, GatewayIntentBits } from 'discord.js';
import path from 'node:path';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';
import { logger } from './util/logging/logger.js';
import { setupDiscordLogging } from './util/logging/discordTransport.js';
import { getLogChannelIds } from './util/logging/config.js';
import { startModerationScheduler } from './modules/moderation/worker/scheduler.js';

const startLogger = logger.withPrefix('startup:init');
const shutdownLogger = logger.withPrefix('startup:shutdown');
const errorLogger = logger.withPrefix('runtime:errors');

const requiredEnv = [
  { key: 'TOKEN', value: process.env.TOKEN },
  { key: 'CLIENT_ID', value: process.env.CLIENT_ID },
  { key: 'GUILD_ID', value: process.env.GUILD_ID },
];

const missingEnv = requiredEnv.filter((entry) => !entry.value);
if (missingEnv.length) {
  for (const entry of missingEnv) {
    startLogger.error(`Fehlende Umgebungsvariable: ${entry.key}`);
  }
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences, // Presence-Intent im Dev-Portal aktivieren
    GatewayIntentBits.GuildMessages, // Kein Message-Content-Intent nötig
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
  ],
});

const logChannelIds = getLogChannelIds();
setupDiscordLogging(client, logChannelIds);

const createErrorId = () => {
  try {
    return randomUUID();
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
};

const shutdown = (code = 0) => {
  shutdownLogger.info('Fahre herunter…');
  client.destroy().finally(() => process.exit(code));
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('unhandledRejection', (err) => {
  const errorId = createErrorId();
  errorLogger.error(`Unbehandelte Ausnahme (${errorId}):`, err);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  const errorId = createErrorId();
  errorLogger.error(`Unbehandelte Ausnahme (${errorId}):`, err);
  shutdown(1);
});

startLogger.info('Starte…');
await commandLoader(client);
const eventsDir = process.env.EVENTS_DIR
  ? path.resolve(process.cwd(), process.env.EVENTS_DIR)
  : undefined;
await eventLoader(client, eventsDir);

client.once('ready', () => {
  startModerationScheduler(client);
});

await client.login(process.env.TOKEN);
