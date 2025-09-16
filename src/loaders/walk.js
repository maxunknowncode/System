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

  const subdirectories = [];

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      subdirectories.push(filePath);
    } else if (entry.isFile()) {
      yield filePath;
    }
  }

  for (const subdirectory of subdirectories) {
    for await (const nested of walk(subdirectory, { onError })) {
      yield nested;
    }
  }
}
