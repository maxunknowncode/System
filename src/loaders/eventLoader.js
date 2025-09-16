/*
### Zweck: Lädt rekursiv Event-Handler (handler.js|index.js) und bindet sie am Client (on/once).
*/
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../util/logger.js';

export default async function eventLoader(client) {
  const baseDir = path.join(process.cwd(), 'src', 'events');
  let loaded = 0;

  async function traverse(dir) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (err) {
      logger.error('[ereignisse] Verzeichnis konnte nicht gelesen werden:', dir, err);
      return;
    }
    const names = entries.map((e) => e.name);
    const file = names.includes('handler.js')
      ? 'handler.js'
      : names.includes('index.js')
        ? 'index.js'
        : null;

    if (file) {
      const filePath = path.join(dir, file);
      try {
        const mod = (await import(filePath)).default;
        if (!mod?.name || typeof mod.execute !== 'function') {
          logger.warn(`[ereignisse] Überspringe ${path.relative(baseDir, filePath)}: name/execute fehlt`);
          return;
        }

        const handler = async (...args) => {
          try {
            await mod.execute(...args, client);
          } catch (err) {
            logger.error(`[ereignisse] Fehler im Handler ${mod.name}:`, err);
          }
        };

        if (mod.once) {
          client.once(mod.name, handler);
        } else {
          client.on(mod.name, handler);
        }
        loaded++;
      } catch (err) {
        logger.warn(`[ereignisse] Laden von ${filePath} fehlgeschlagen:`, err);
      }
    } else {
      for (const entry of entries.filter((e) => e.isDirectory())) {
        await traverse(path.join(dir, entry.name));
      }
    }
  }

  await traverse(baseDir);
  logger.info(`[ereignisse] Gebunden: ${loaded} Ereignis(se)`);
}
