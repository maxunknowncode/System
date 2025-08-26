import { readdir } from 'node:fs/promises';
import path from 'node:path';

export default async function commandLoader(client) {
  const baseDir = path.join(process.cwd(), 'src', 'commands');
  const commands = new Map();
  let loaded = 0;

  async function traverse(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      console.error('[commands] Failed to read directory:', dir, err);
      return;
    }
    const names = entries.map((e) => e.name);
    const file = names.includes('command.js')
      ? 'command.js'
      : names.includes('index.js')
        ? 'index.js'
        : null;

    if (file) {
      const filePath = path.join(dir, file);
      try {
        const mod = (await import(filePath)).default;
        if (typeof mod?.name === 'string' && typeof mod?.description === 'string') {
          commands.set(mod.name, mod);
          loaded++;
        } else {
          console.warn(`[commands] Skipping ${path.relative(baseDir, filePath)}: name/description missing`);
        }
      } catch (err) {
        console.warn(`[commands] Failed to load ${filePath}:`, err);
      }
    } else {
      for (const entry of entries.filter((e) => e.isDirectory())) {
        await traverse(path.join(dir, entry.name));
      }
    }
  }

  await traverse(baseDir);
  client.commands = commands;
  console.log(`[commands] Loaded ${loaded} command(s)`);
}
