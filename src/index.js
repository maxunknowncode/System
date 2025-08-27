import { Client, GatewayIntentBits } from 'discord.js';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';
import { logger } from './util/logger.js';

if (!process.env.TOKEN) {
  logger.error('[ENV] TOKEN missing');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const shutdown = (code = 0) => {
  logger.info('[shutdown] Shutting down');
  client.destroy().finally(() => process.exit(code));
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('unhandledRejection', (err) => {
  logger.error('[crash] Unhandled rejection:', err);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  logger.error('[crash] Uncaught exception:', err);
  shutdown(1);
});
logger.debug('[startup] Loading modules');
await commandLoader(client);
await eventLoader(client);

await client.login(process.env.TOKEN);
