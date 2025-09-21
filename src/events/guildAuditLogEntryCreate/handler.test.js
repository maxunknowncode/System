import { AuditLogEvent } from 'discord-api-types/v10';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_LEVEL = process.env.LOG_LEVEL;

const loadHandler = async () => (await import('./handler.js')).default;

const createEntry = (overrides = {}) => ({
  action: AuditLogEvent.RoleUpdate,
  actionType: 'Update',
  executorId: '1111',
  executor: { id: '1111', tag: 'Mod#0001' },
  target: { id: '2222', name: 'Example Rolle' },
  targetId: '2222',
  targetType: 'Role',
  reason: 'Routine-Anpassung',
  extra: null,
  changes: [],
  id: 'log-entry-1',
  ...overrides,
});

describe('guildAuditLogEntryCreate handler', () => {
  beforeEach(() => {
    process.env.LOG_LEVEL = 'debug';
    vi.resetModules();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.LOG_LEVEL = ORIGINAL_LEVEL;
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it('meldet destructive Aktionen als Warnung mit Metadaten', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = await loadHandler();

    const entry = createEntry({
      action: AuditLogEvent.MessageDelete,
      actionType: 'Delete',
      targetType: 'User',
      target: { id: '222', username: 'User', discriminator: '1234' },
      targetId: '222',
      reason: 'Spam',
      extra: { channel: { id: '333', name: 'allgemein' }, count: 2 },
      changes: [{ key: 'count', new: 2 }],
      id: 'audit-123',
    });

    await handler.execute(entry, { id: '999' });

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).not.toHaveBeenCalled();
    const [message, metadata] = warnSpy.mock.calls[0];
    expect(message).toBe(
      '[audit:message_delete] Message Delete: User#1234 (222) • Kanal: <#333>, Anzahl: 2 • Änderungen: Count',
    );
    expect(metadata).toContain("action: 'message_delete'");
    expect(metadata).toContain("actorId: '1111'");
    expect(metadata).toContain("targetId: '222'");
    expect(metadata).toContain("targetMention: '<@222>'");
    expect(metadata).toContain("reason: 'Spam'");
    expect(metadata).not.toContain('entryId');
    expect(metadata).not.toContain('guildId');
    expect(metadata).not.toContain('targetType');
    expect(metadata).not.toContain('channelId');

    warnSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('meldet neutrale Änderungen als Info und fasst Änderungen zusammen', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = await loadHandler();

    const entry = createEntry({
      changes: [
        { key: 'name', old: 'Alte Rolle', new: 'Neue Rolle' },
        { key: 'permissions', new: { allow: '8' } },
      ],
    });

    await handler.execute(entry, { id: '999' });

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    const [message, metadata] = infoSpy.mock.calls[0];
    expect(message).toBe(
      '[audit:role_update] Role Update: Example Rolle (2222) • Änderungen: Name, Permissions',
    );
    expect(metadata).toContain("action: 'role_update'");
    expect(metadata).toContain("actorId: '1111'");
    expect(metadata).toContain("targetId: '2222'");
    expect(metadata).toContain("targetMention: '<@&2222>'");
    expect(metadata).toContain("reason: 'Routine-Anpassung'");
    expect(metadata).not.toContain('entryId');
    expect(metadata).not.toContain('guildId');
    expect(metadata).not.toContain('targetType');

    warnSpy.mockRestore();
    infoSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('fängt Fehler im Handler ab', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const handler = await loadHandler();

    await handler.execute(null, { id: '999' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('[audit]');

    errorSpy.mockRestore();
  });
});
