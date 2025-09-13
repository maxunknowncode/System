/*
### Zweck: Lädt rekursiv gültige Commands (command.js|index.js) in client.commands und fasst die Anzahl zusammen.
*/
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../util/logger.js';

export default async function commandLoader(client) {
  const baseDir = path.join(process.cwd(), 'src', 'commands');
  const commands = new Map();
  let loaded = 0;

  async function traverse(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      logger.error('[befehle] Verzeichnis konnte nicht gelesen werden:', dir, err);
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
        if (
          typeof mod?.name === 'string' &&
          typeof mod?.description === 'string' &&
          typeof mod?.execute === 'function'
        ) {
          commands.set(mod.name, mod);
          loaded++;
        } else {
          logger.warn(
            `[befehle] Überspringe ${path.relative(baseDir, filePath)}: name/description/execute fehlt`
          );
        }
      } catch (err) {
        logger.warn(`[befehle] Laden von ${filePath} fehlgeschlagen:`, err);
      }
    } else {
      for (const entry of entries.filter((e) => e.isDirectory())) {
        await traverse(path.join(dir, entry.name));
      }
    }
  }

  await traverse(baseDir);
  client.commands = commands;
  logger.info(`[befehle] Geladen: ${commands.size} Befehl(e)`);
}
