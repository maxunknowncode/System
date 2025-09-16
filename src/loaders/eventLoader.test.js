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


const eventModule = (name, once = false) => `export default {
  name: '${name}',
  once: ${once},
  async execute() {},
};`;

describe('eventLoader', () => {
  it('registers once event handlers with client.once and triggers only once', async () => {
    const tempBase = await mkdtemp(path.join(tmpdir(), 'event-loader-once-'));
    const eventsDir = path.join(tempBase, 'src', 'events', 'once');
    await mkdir(eventsDir, { recursive: true });
    const handlerPath = path.join(eventsDir, 'handler.js');
    await writeFile(handlerPath, onceEventModule);

    const onceHandlers = new Map();
    const client = {
      on: vi.fn(),
      once: vi.fn((eventName, handler) => {
        onceHandlers.set(eventName, handler);
      }),
      emit: (eventName, ...args) => {
        const handler = onceHandlers.get(eventName);
        if (!handler) return undefined;
        onceHandlers.delete(eventName);
        return handler(...args);
      },
    };

    let cwdSpy;

    try {
      vi.resetModules();
      cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempBase);

      const { default: eventLoader } = await import('./eventLoader.js');
      await eventLoader(client);

      expect(client.once).toHaveBeenCalledTimes(1);
      expect(client.on).not.toHaveBeenCalled();
      const [eventName] = client.once.mock.calls[0];
      expect(eventName).toBe('onceEvent');
      expect(onceHandlers.has('onceEvent')).toBe(true);

      const mod = await import(handlerPath);
      expect(mod.callCount).toBe(0);

      await client.emit('onceEvent');
      expect(mod.callCount).toBe(1);

      await client.emit('onceEvent');
      expect(mod.callCount).toBe(1);
      expect(onceHandlers.has('onceEvent')).toBe(false);
    } finally {
      await rm(tempBase, { recursive: true, force: true });
      cwdSpy?.mockRestore();
      vi.restoreAllMocks();
    }
  });

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

  it('bindet keine Handler aus Unterordnern bereits geladener Handler', async () => {
    const tempBase = await mkdtemp(path.join(tmpdir(), 'event-loader-'));
    const parentDir = path.join(tempBase, 'src', 'events', 'parent');
    const nestedDir = path.join(parentDir, 'nested');
    const siblingDir = path.join(tempBase, 'src', 'events', 'sibling');

    await mkdir(nestedDir, { recursive: true });
    await mkdir(siblingDir, { recursive: true });
    await writeFile(path.join(parentDir, 'handler.js'), eventModule('parentEvent'));
    await writeFile(path.join(nestedDir, 'handler.js'), eventModule('nestedEvent'));
    await writeFile(path.join(siblingDir, 'index.js'), eventModule('siblingEvent', true));

    const client = { on: vi.fn(), once: vi.fn() };
    let infoSpy;
    let warnSpy;
    let cwdSpy;

    try {
      vi.resetModules();
      cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tempBase);
      const { logger } = await import('../util/logger.js');
      infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
      warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});

      const { default: eventLoader } = await import('./eventLoader.js');
      await eventLoader(client);

      expect(client.on).toHaveBeenCalledTimes(1);
      expect(client.once).toHaveBeenCalledTimes(1);

      const boundOnEvents = client.on.mock.calls.map(([name]) => name);
      const boundOnceEvents = client.once.mock.calls.map(([name]) => name);

      expect(boundOnEvents).toContain('parentEvent');
      expect(boundOnEvents).not.toContain('nestedEvent');
      expect(boundOnceEvents).toContain('siblingEvent');
    } finally {
      await rm(tempBase, { recursive: true, force: true });
      infoSpy?.mockRestore();
      warnSpy?.mockRestore();
      cwdSpy?.mockRestore();
      vi.restoreAllMocks();
    }
  });
});
