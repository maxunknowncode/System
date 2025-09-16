import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';

const failingEventModule = `export default {
  name: 'failingEvent',
  once: false,
  async execute() {
    throw new Error('handler failed');
  },
};`;

describe('eventLoader', () => {
  it('logs errors thrown by event handlers', async () => {
    const tempBase = await mkdtemp(path.join(tmpdir(), 'event-loader-'));
    const baseDir = path.join(tempBase, 'src', 'events');
    const failingDir = path.join(baseDir, 'failing');
    await mkdir(failingDir, { recursive: true });
    const handlerPath = path.join(failingDir, 'handler.js');
    await writeFile(handlerPath, failingEventModule);

    const client = { on: vi.fn(), once: vi.fn() };
    let errorSpy;

    try {
      vi.resetModules();
      const { logger } = await import('../util/logger.js');
      errorSpy = vi.spyOn(logger, 'error').mockImplementation(() => {});

      const { default: eventLoader } = await import('./eventLoader.js');
      await eventLoader(client, baseDir);

      expect(client.on).toHaveBeenCalledTimes(1);
      const [eventName, handler] = client.on.mock.calls[0];
      expect(eventName).toBe('failingEvent');

      await handler();

      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('failingEvent');
    } finally {
      await rm(tempBase, { recursive: true, force: true });
      errorSpy?.mockRestore();
      vi.restoreAllMocks();
    }
  });
});
