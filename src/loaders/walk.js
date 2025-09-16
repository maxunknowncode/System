import { readdir } from 'node:fs/promises';
import path from 'node:path';

export async function* walk(dir, { onError } = {}) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    onError?.(error, dir);
    return;
  }

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for await (const nested of walk(filePath, { onError })) {
        yield nested;
      }
    } else if (entry.isFile()) {
      yield filePath;
    }
  }
}
