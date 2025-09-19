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
    expect(entry.rawArgs).toEqual(['hello', { foo: 'bar' }]);
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it('creates prefixed logger contexts and notifies transports with context data', async () => {
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    const { logger, registerLogTransport } = await import('./logger.js');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const transport = vi.fn();
    const unsubscribe = registerLogTransport(transport);

    const prefixed = logger.withPrefix('test');
    prefixed.info('message', { foo: 'bar' });

    await Promise.resolve();

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith('[test] message', { foo: 'bar' });
    expect(transport).toHaveBeenCalledTimes(1);
    const entry = transport.mock.calls[0][0];
    expect(entry.args[0]).toBe('[test] message');
    expect(entry.rawArgs[0]).toBe('message');
    expect(entry.rawArgs[1]).toEqual({ foo: 'bar' });
    expect(entry.context).toMatchObject({
      label: 'test',
      segments: ['test'],
      text: '[test]',
    });
    expect(entry.context.metadata).toBeUndefined();

    unsubscribe();
    infoSpy.mockRestore();
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

  const CHANNEL_IDS = Object.freeze({
    generalChannelId: 'general-channel',
    joinToCreateChannelId: 'join2create-channel',
  });

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
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    logger.info('general entry');
    await flushAsync();

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(CHANNEL_IDS.generalChannelId);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith({
      content: expect.stringContaining('general entry'),
      allowedMentions: { parse: [] },
    });
    expect(send.mock.calls[0][0].content.trim()).toBe('general entry');
    expect(send.mock.calls[0][0].embeds).toBeUndefined();

    unsubscribe();
  });

  it('includes context labels for general logs with prefixes', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client, fetch } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    const prefixed = logger.withPrefix('jobs').withPrefix('worker');
    prefixed.warn('started');
    await flushAsync();

    expect(fetch).toHaveBeenCalledWith(CHANNEL_IDS.generalChannelId);
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.embeds).toBeUndefined();
    expect(payload.content?.trim()).toBe('[jobs:worker] started');

    unsubscribe();
  });

  it('truncates long general logs to the plain text limit', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});

    const parts = Array.from({ length: 5 }, (_, index) => String.fromCharCode(65 + index).repeat(1500));
    logger.info(...parts);
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.embeds).toBeUndefined();
    expect(payload.content).toBeDefined();
    expect(payload.content.length).toBeLessThanOrEqual(2000);
    expect(payload.content.length).toBeGreaterThan(1900);
    expect(payload.content.endsWith('…')).toBe(true);

    unsubscribe();
    infoSpy.mockRestore();
  });

  it('sends audit logs with structured embed data', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    const auditLogger = logger.withPrefix('audit').withPrefix('message_delete');
    auditLogger.warn('Nachricht entfernt', {
      actorId: '111',
      targetId: '222',
      channelId: '333',
      reason: 'Spam',
      count: 2,
    });
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    expect(client.channels.fetch).toHaveBeenCalledWith(CHANNEL_IDS.generalChannelId);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('Nachricht entfernt');
    expect(embed.data.description).not.toMatch(/\[audit/i);
    expect(embed.data.description.trim()).toBe('Nachricht entfernt');

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
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    const auditLogger = logger.withPrefix('audit').withPrefix('role_update');
    auditLogger.info('Rolle angepasst');
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    expect(client.channels.fetch).toHaveBeenCalledWith(CHANNEL_IDS.generalChannelId);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('Rolle angepasst');
    expect(embed.data.description).not.toMatch(/\[audit/i);
    expect(embed.data.description.trim()).toBe('Rolle angepasst');

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
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    const joinLogger = logger.withPrefix('join2create');
    joinLogger.info('channel created');
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    expect(client.channels.fetch).toHaveBeenCalledWith(CHANNEL_IDS.joinToCreateChannelId);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const embed = payload.embeds[0];
    expect(embed.data.description).toContain('channel created');
    expect(embed.data.description).not.toMatch(/\[join2create/i);
    expect(embed.data.description.trim()).toBe('channel created');
    expect(embed.data.fields).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: 'Kategorie', value: 'Join2Create' }),
      ]),
    );

    unsubscribe();
  });

  it('allows embed descriptions to use the higher limit', async () => {
    const send = vi.fn().mockResolvedValue();
    const { client } = createClient(send);

    const { setupDiscordLogging } = await import('./discordLogger.js');
    const unsubscribe = setupDiscordLogging(client, CHANNEL_IDS);
    const { logger } = await import('./logger.js');

    const joinLogger = logger.withPrefix('join2create');
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const parts = Array.from({ length: 5 }, (_, index) => String.fromCharCode(65 + index).repeat(1500));
    joinLogger.info(...parts);
    await flushAsync();

    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0][0];
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toHaveLength(1);
    const description = payload.embeds[0].data.description;
    expect(description).toBeDefined();
    expect(description.length).toBe(4000);
    expect(description.length).toBeGreaterThan(2000);
    expect(description.endsWith('…')).toBe(true);

    unsubscribe();
    infoSpy.mockRestore();
  });
});
