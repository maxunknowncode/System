import { readdir } from 'node:fs/promises';
import path from 'node:path';

export default async function commandLoader(client) {
  const commandsDir = path.join(process.cwd(), 'src', 'commands');
  const files = await collectFiles(commandsDir);

  const commands = new Map();

  for (const filePath of files) {
    try {
      const command = (await import(filePath)).default;
      if (typeof command?.name !== 'string' || typeof command?.description !== 'string') {
        console.warn(`Invalid command structure in ${path.basename(filePath)}`);
        continue;
      }
      commands.set(command.name, command);
    } catch (err) {
      console.error(`Failed to load command at ${filePath}:`, err);
    }
  }

  client.commands = commands;
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const res = path.resolve(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(res));
    } else if (entry.isFile() && res.endsWith('.js')) {
      files.push(res);
    }
  }
  return files;
}

