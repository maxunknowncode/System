/*
### Zweck: Lädt rekursiv Event-Handler (handler.js|index.js) und bindet sie am Client (on/once).
*/
import path from 'node:path';
import { logger } from '../util/logging/logger.js';
import { walk } from './walk.js';

const eventsLogger = logger.withPrefix('loader:events');

export default async function eventLoader(
  client,
  baseDir = path.join(process.cwd(), 'src', 'events'),
) {
  let loaded = 0;
  const eventFiles = [];

  const handleReadError = (err, dir) => {
    eventsLogger.error('Verzeichnis konnte nicht gelesen werden:', dir, err);
  };

  for await (const filePath of walk(baseDir, { onError: handleReadError })) {
    const fileName = path.basename(filePath);
    if (fileName === 'index.js') {
      eventsLogger.warn(
        `Überspringe ${path.relative(baseDir, filePath)}: erwarteter Dateiname handler.js`
      );
      continue;
    }

    if (fileName !== 'handler.js') {
      continue;
    }

    eventFiles.push(filePath);
  }

  for (const filePath of eventFiles) {
    try {
      const mod = (await import(filePath)).default;
      if (!mod?.name || typeof mod.execute !== 'function') {
        eventsLogger.warn(`Überspringe ${path.relative(baseDir, filePath)}: name/execute fehlt`);
        continue;
      }

      const handler = async (...args) => {
        try {
          await mod.execute(...args, client);
        } catch (err) {
          eventsLogger.error(`Fehler im Handler ${mod.name}:`, err);
        }
      };

      if (mod.once) {
        client.once(mod.name, handler);
      } else {
        client.on(mod.name, handler);
      }
      loaded++;
    } catch (err) {
      eventsLogger.warn(`Laden von ${filePath} fehlgeschlagen:`, err);
    }
  }

  eventsLogger.info(`Gebunden: ${loaded} Ereignis(se)`);
}
