import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_LEVEL = process.env.LOG_LEVEL;

describe('logger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.LOG_LEVEL = ORIGINAL_LEVEL;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('logs only above set level', async () => {
    process.env.LOG_LEVEL = 'warn';
    vi.resetModules();
    const { logger } = await import('./logger.js');
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');

    expect(debugSpy).not.toHaveBeenCalled();
    expect(infoSpy).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('warn');
    expect(errorSpy).toHaveBeenCalledWith('error');
  });

  it('notifies transports for emitted logs', async () => {
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    const { logger, registerLogTransport } = await import('./logger.js');
    const transport = vi.fn();
    registerLogTransport(transport);

    logger.info('hello', { foo: 'bar' });

    await Promise.resolve();

    expect(transport).toHaveBeenCalledTimes(1);
    const entry = transport.mock.calls[0][0];
    expect(entry.level).toBe('info');
    expect(entry.args[0]).toBe('hello');
    expect(entry.args[1]).toEqual({ foo: 'bar' });
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('skips transports for filtered levels', async () => {
    process.env.LOG_LEVEL = 'error';
    vi.resetModules();
    const { logger, registerLogTransport } = await import('./logger.js');
    const transport = vi.fn();
    registerLogTransport(transport);

    logger.warn('should not emit');

    await Promise.resolve();

    expect(transport).not.toHaveBeenCalled();
  });
});
