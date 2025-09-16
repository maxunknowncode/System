/*
### Zweck: Lädt rekursiv Event-Handler (handler.js|index.js) und bindet sie am Client (on/once).
*/
import path from 'node:path';
import { logger } from '../util/logger.js';
import { walk } from './walk.js';

export default async function eventLoader(
  client,
  baseDir = path.join(process.cwd(), 'src', 'events'),
) {
  let loaded = 0;
  const filesByDir = new Map();
  const processedDirs = new Set();

  const handleReadError = (err, dir) => {
    logger.error('[ereignisse] Verzeichnis konnte nicht gelesen werden:', dir, err);
  };

  const hasProcessedAncestor = (directory) => {
    for (const processed of processedDirs) {
      if (processed === directory) {
        continue;
      }

      const relative = path.relative(processed, directory);
      if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) {
        return true;
      }
    }

    return false;
  };

  for await (const filePath of walk(baseDir, { onError: handleReadError })) {
    const fileName = path.basename(filePath);
    if (fileName !== 'handler.js' && fileName !== 'index.js') {
      continue;
    }

    const directory = path.dirname(filePath);
    if (hasProcessedAncestor(directory)) {
      continue;
    }

    if (!filesByDir.has(directory)) {
      filesByDir.set(directory, filePath);
      processedDirs.add(directory);
    } else if (fileName === 'handler.js') {
      filesByDir.set(directory, filePath);
    }
  }

  for (const filePath of filesByDir.values()) {
    try {
      const mod = (await import(filePath)).default;
      if (!mod?.name || typeof mod.execute !== 'function') {
        logger.warn(`[ereignisse] Überspringe ${path.relative(baseDir, filePath)}: name/execute fehlt`);
        continue;
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
  }

  logger.info(`[ereignisse] Gebunden: ${loaded} Ereignis(se)`);
}
