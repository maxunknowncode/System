import { describe, it, expect, vi } from 'vitest';

describe('logger', () => {
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

    vi.restoreAllMocks();
  });
});
