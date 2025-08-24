import { readdir } from 'node:fs/promises';
import path from 'node:path';

export default async function eventLoader(client) {
  const eventsDir = path.join(process.cwd(), 'src', 'events');
  let files = [];
  try {
    files = await readdir(eventsDir);
  } catch (err) {
    console.error('Failed to read events directory:', err);
    return;
  }

  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(eventsDir, file);
    try {
      const event = (await import(filePath)).default;
      if (!event?.name || typeof event.execute !== 'function') {
        console.warn(`Invalid event structure in ${file}`);
        continue;
      }
      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
    } catch (err) {
      console.error(`Failed to load event ${file}:`, err);
    }
  }
}

