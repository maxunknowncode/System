import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('discord.js', () => {
  class FakeEmbedBuilder {
    constructor() {
      this.data = { fields: [] };
    }

    setColor(color) {
      this.data.color = color;
      return this;
    }

    setAuthor(author) {
      this.data.author = author;
      return this;
    }

    setDescription(description) {
      this.data.description = description;
      return this;
    }

    setTimestamp(timestamp) {
      this.data.timestamp = timestamp;
      return this;
    }

    addFields(...fields) {
      this.data.fields.push(...fields);
      return this;
    }

    setFooter(footer) {
      this.data.footer = footer;
      return this;
    }
  }

  return { EmbedBuilder: FakeEmbedBuilder };
});

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

describe('setupDiscordLogging', () => {
  const flushAsync = async () => {
    await new Promise((resolve) => setImmediate(resolve));
    await new Promise((resolve) => setImmediate(resolve));
  };

  const createClient = (send) => {
    const channel = {
      isTextBased: () => true,
      send,
    };
    const fetch = vi.fn().mockResolvedValue(channel);
    return {
      client: {
        isReady: () => true,
        channels: { fetch },
      },
      fetch,
    };
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('sends general logs as plain text messages', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client, fetch } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client);
    const { logger } = await import('./logger.js');

    logger.info('general entry');
    await flushAsync();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      content: expect.stringContaining('general entry'),
      allowedMentions: { parse: [] },
    });
    expect(send.mock.calls[0][0].embeds).toBeUndefined();

    unsubscribe();
  });

  it('sends audit logs with structured embed data', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client);
    const { logger } = await import('./logger.js');

    logger.warn('[audit:message_delete] Nachricht entfernt', {
      actorId: '111',
      targetId: '222',
      channelId: '333',
      reason: 'Spam',
      count: 2,
    });
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('Nachricht entfernt');
    expect(embed.data.description).not.toMatch(/\[audit/i);

    expect(embed.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Level', value: '`WARN`' }),
        expect.objectContaining({ name: 'Aktion', value: '`message_delete`' }),
        expect.objectContaining({ name: 'Auslöser', value: '<@111>' }),
        expect.objectContaining({ name: 'Ziel', value: '<@222>' }),
        expect.objectContaining({ name: 'Kanal', value: '<#333>' }),
        expect.objectContaining({ name: 'Grund', value: 'Spam' }),
        expect.objectContaining({ name: 'Count', value: '2' }),
      ]),
    );

    unsubscribe();
  });

  it('sends audit logs without metadata with fallback fields', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client);
    const { logger } = await import('./logger.js');

    logger.info('[audit:role_update] Rolle angepasst');
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('Rolle angepasst');
    expect(embed.data.description).not.toMatch(/\[audit/i);

    expect(embed.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Level', value: '`INFO`' }),
        expect.objectContaining({ name: 'Aktion', value: '`role_update`' }),
        expect.objectContaining({ name: 'Auslöser', value: '_Nicht angegeben_' }),
        expect.objectContaining({ name: 'Ziel', value: '_Nicht angegeben_' }),
        expect.objectContaining({ name: 'Kanal', value: '_Nicht angegeben_' }),
        expect.objectContaining({ name: 'Grund', value: '_Nicht angegeben_' }),
      ]),
    );

    unsubscribe();
  });

  it('sends join2create logs as embeds without prefix', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client);
    const { logger } = await import('./logger.js');

    logger.info('[join2create] channel created');
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('channel created');
    expect(embed.data.description).not.toMatch(/\[join2create/i);
    expect(embed.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Kategorie', value: 'Join2Create' }),
      ]),
    );

    unsubscribe();
  });
});
