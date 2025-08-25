import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const applicationId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

if (!token || !applicationId || !guildId) {
  console.error('[ENV] TOKEN/CLIENT_ID/GUILD_ID missing');
  process.exit(1);
}

async function readCommands() {
  const commandsDir = path.join(process.cwd(), 'src', 'commands');
  const files = await readdir(commandsDir);
  const commands = [];

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    try {
      const command = (await import(path.join(commandsDir, file))).default;
      if (command?.name && command?.description) {
        commands.push({ name: command.name, description: command.description });
      }
    } catch (err) {
      console.error(`Failed to load command ${file}:`, err);
    }
  }

  return commands;
}

async function registerGuildCommands() {
  const commands = await readCommands();
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    console.log(`Registering ${commands.length} command(s) to guild ${guildId}...`);
    await rest.put(
      Routes.applicationGuildCommands(applicationId, guildId),
      { body: commands },
    );
    console.log('Guild commands registered successfully.');
  } catch (error) {
    console.error('Error registering guild commands:', error);
    process.exit(1);
  }
}

registerGuildCommands();

