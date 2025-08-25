import { Client, GatewayIntentBits } from 'discord.js';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';

if (!process.env.TOKEN) {
  console.error('[ENV] TOKEN missing. Set TOKEN in Railway Variables.');
  process.exit(1);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await commandLoader(client);
await eventLoader(client);

await client.login(process.env.TOKEN);

