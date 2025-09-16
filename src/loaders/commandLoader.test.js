import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const commandModule = (name) => `export default {
  name: '${name}',
  description: '${name} description',
  async execute() {},
};`;

describe('commandLoader', () => {
  it('überspringt Commands in Unterordnern geladener Commands', async () => {
    const tempBase = await mkdtemp(path.join(tmpdir(), 'command-loader-'));
    const parentDir = path.join(tempBase, 'src', 'commands', 'parent');
    const nestedDir = path.join(parentDir, 'nested');
    const siblingDir = path.join(tempBase, 'src', 'commands', 'sibling');

    await mkdir(nestedDir, { recursive: true });
    await mkdir(siblingDir, { recursive: true });
    await writeFile(path.join(parentDir, 'command.js'), commandModule('parent'));
    await writeFile(path.join(nestedDir, 'command.js'), commandModule('nested'));
    await writeFile(path.join(siblingDir, 'index.js'), commandModule('sibling'));

    const client = {};
    let cwdSpy;
    let infoSpy;
    let warnSpy;

    try {
      vi.resetModules();
      cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempBase);
      const { logger } = await import('../util/logger.js');
      infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
      warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const { default: commandLoader } = await import('./commandLoader.js');
      await commandLoader(client);

      expect(client.commands).toBeInstanceOf(Map);
      expect(Array.from(client.commands.keys()).sort()).toEqual(['parent', 'sibling']);
      expect(client.commands.has('nested')).toBe(false);
    } finally {
      await rm(tempBase, { recursive: true, force: true });
      infoSpy?.mockRestore();
      warnSpy?.mockRestore();
      cwdSpy?.mockRestore();
      vi.restoreAllMocks();
    }
  });
});
