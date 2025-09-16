import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

import { walk } from './walk.js';

describe('walk', () => {
  it('liefert rekursiv alle Dateipfade', async () => {
    const baseDir = await mkdtemp(path.join(tmpdir(), 'walk-test-'));
    const nestedDir = path.join(baseDir, 'nested', 'deeper');
    await mkdir(nestedDir, { recursive: true });
    await writeFile(path.join(baseDir, 'root.txt'), 'root');
    await writeFile(path.join(nestedDir, 'child.txt'), 'child');

    const files = [];
    try {
      for await (const filePath of walk(baseDir)) {
        files.push(path.relative(baseDir, filePath));
      }
    } finally {
      await rm(baseDir, { recursive: true, force: true });
    }

    expect(new Set(files)).toEqual(new Set(['root.txt', path.join('nested', 'deeper', 'child.txt')]));
  });

  it('ruft onError auf, wenn ein Verzeichnis nicht gelesen werden kann', async () => {
    const onError = vi.fn();
    const nonExisting = path.join(tmpdir(), 'walk-missing', String(Date.now()));

    const results = [];
    for await (const filePath of walk(nonExisting, { onError })) {
      results.push(filePath);
    }

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError.mock.calls[0][1]).toBe(nonExisting);
    expect(results).toHaveLength(0);
  });
});
