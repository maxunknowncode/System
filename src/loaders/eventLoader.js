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
      logger.error('[events] Failed to read directory:', dir, err);
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
          logger.warn(`[events] Skipping ${path.relative(baseDir, filePath)}: name/execute missing`);
          return;
        }
        if (mod.once) {
          client.once(mod.name, (...args) => mod.execute(...args, client));
        } else {
          client.on(mod.name, (...args) => mod.execute(...args, client));
        }
        loaded++;
      } catch (err) {
        logger.warn(`[events] Failed to load ${filePath}:`, err);
      }
    } else {
      for (const entry of entries.filter((e) => e.isDirectory())) {
        await traverse(path.join(dir, entry.name));
      }
    }
  }

  await traverse(baseDir);
  logger.info(`[events] Bound ${loaded} event(s)`);
}
