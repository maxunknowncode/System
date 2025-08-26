import { Client, GatewayIntentBits } from 'discord.js';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';

if (!process.env.TOKEN) {
  console.error('[ENV] TOKEN missing');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const shutdown = (code = 0) => {
  console.log('[shutdown] Shutting down');
  client.destroy().finally(() => process.exit(code));
};

process.on('SIGINT', () => shutdown());
process.on('SIGTERM', () => shutdown());
process.on('unhandledRejection', (err) => {
  console.error('[crash] Unhandled rejection:', err);
  shutdown(1);
});
process.on('uncaughtException', (err) => {
  console.error('[crash] Uncaught exception:', err);
  shutdown(1);
});

console.log('[startup] Loading modules');
await commandLoader(client);
await eventLoader(client);

await client.login(process.env.TOKEN);
