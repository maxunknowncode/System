/*
### Zweck: Lädt rekursiv gültige Commands (command.js|index.js) in client.commands und fasst die Anzahl zusammen.
*/
import path from 'node:path';
import { logger } from '../util/logger.js';
import { walk } from './walk.js';

const commandLogger = logger.withPrefix('befehle');

export default async function commandLoader(client) {
  const baseDir = path.join(process.cwd(), 'src', 'commands');
  const commands = new Map();
  const filesByDir = new Map();
  const processedDirs = new Set();


  const handleReadError = (err, dir) => {
    commandLogger.error('Verzeichnis konnte nicht gelesen werden:', dir, err);
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
    if (fileName !== 'command.js' && fileName !== 'index.js') {
      continue;
    }

    const directory = path.dirname(filePath);
    if (hasProcessedAncestor(directory)) {
      continue;
    }

    if (!filesByDir.has(directory)) {
      filesByDir.set(directory, filePath);
      processedDirs.add(directory);
    } else if (fileName === 'command.js') {
      filesByDir.set(directory, filePath);
    }
  }

  for (const filePath of filesByDir.values()) {
    try {
      const mod = (await import(filePath)).default;
      if (
        typeof mod?.name === 'string' &&
        typeof mod?.description === 'string' &&
        typeof mod?.execute === 'function'
      ) {
        commands.set(mod.name, mod);
      } else {
        commandLogger.warn(
          `Überspringe ${path.relative(baseDir, filePath)}: name/description/execute fehlt`
        );
      }
    } catch (err) {
      commandLogger.warn(`Laden von ${filePath} fehlgeschlagen:`, err);
    }
  }

  client.commands = commands;
  commandLogger.info(`Geladen: ${commands.size} Befehl(e)`);
}
