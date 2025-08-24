import { Client, GatewayIntentBits } from 'discord.js';
import commandLoader from './loaders/commandLoader.js';
import eventLoader from './loaders/eventLoader.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await commandLoader(client);
await eventLoader(client);

await client.login(process.env.TOKEN);

