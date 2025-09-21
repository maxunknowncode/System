import { describe, expect, it, vi } from 'vitest';

const ORIGINAL_TOKEN = process.env.TOKEN;

describe('index entrypoint', () => {
  it('requests the guild moderation intent when creating the client', async () => {
    process.env.TOKEN = 'test-token';

    const intentsCaptured = [];
    const loginMock = vi.fn().mockResolvedValue();
    const destroyMock = vi.fn().mockReturnValue({
      finally(callback) {
        callback?.();
        return Promise.resolve();
      },
    });
    const isReadyMock = vi.fn().mockReturnValue(true);
    const onMock = vi.fn();

    vi.resetModules();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => {});

    vi.doMock('discord.js', () => {
      const GatewayIntentBits = {
        Guilds: 'GUILDS',
        GuildMembers: 'GUILD_MEMBERS',
        GuildPresences: 'GUILD_PRESENCES',
        GuildMessages: 'GUILD_MESSAGES',
        GuildVoiceStates: 'GUILD_VOICE_STATES',
        GuildModeration: 'GUILD_MODERATION',
      };

      class Client {
        constructor(options = {}) {
          intentsCaptured.push(options.intents ?? []);
          this.channels = { fetch: vi.fn() };
          this.login = loginMock;
          this.destroy = destroyMock;
          this.isReady = isReadyMock;
          this.on = onMock;
        }

        off = vi.fn();
      }

      return { Client, GatewayIntentBits };
    });

    vi.doMock('./loaders/commandLoader.js', () => ({ default: vi.fn().mockResolvedValue() }));
    vi.doMock('./loaders/eventLoader.js', () => ({ default: vi.fn().mockResolvedValue() }));
    vi.doMock('./util/discordLogger.js', () => ({ setupDiscordLogging: vi.fn() }));
    vi.doMock('./util/logging/config.js', () => ({
      getLogChannelIds: vi.fn().mockReturnValue({
        generalChannelId: 'general',
        joinToCreateChannelId: 'join',
      }),
    }));

    try {
      await import('./index.js');

      expect(intentsCaptured).toHaveLength(1);
      const intents = intentsCaptured[0];
      expect(intents).toContain('GUILD_MODERATION');
      expect(loginMock).toHaveBeenCalledWith('test-token');
    } finally {
      exitSpy.mockRestore();
      vi.resetModules();
      process.env.TOKEN = ORIGINAL_TOKEN;
    }
  });
});
