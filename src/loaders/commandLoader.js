/*
### Zweck: Lädt rekursiv gültige Commands (command.js|index.js) in client.commands und fasst die Anzahl zusammen.
*/
import path from 'node:path';
import { logger } from '../util/logging/logger.js';
import { walk } from './walk.js';

const commandLogger = logger.withPrefix('loader:commands');

export default async function commandLoader(client) {
  const baseDir = path.join(process.cwd(), 'src', 'commands');
  const commands = new Map();
  const commandFiles = [];

  const handleReadError = (err, dir) => {
    commandLogger.error('Verzeichnis konnte nicht gelesen werden:', dir, err);
  };

  for await (const filePath of walk(baseDir, { onError: handleReadError })) {
    const fileName = path.basename(filePath);
    if (fileName === 'index.js') {
      commandLogger.warn(
        `Überspringe ${path.relative(baseDir, filePath)}: erwarteter Dateiname command.js`
      );
      continue;
    }

    if (fileName !== 'command.js') {
      continue;
    }

    commandFiles.push(filePath);
  }

  for (const filePath of commandFiles) {
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
