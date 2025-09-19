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
      '[audit:message_delete] Aktion Message Delete (Delete) • Ziel [User]: User#1234 (222) • Änderungen: count: 2 • Details: Kanal: allgemein (333); Anzahl: 2',
    );
    expect(metadata).toEqual({
      action: 'message_delete',
      actionType: 'Delete',
      actorId: '1111',
      channelId: '333',
      count: 2,
      entryId: 'audit-123',
      guildId: '999',
      reason: 'Spam',
      targetId: '222',
      targetType: 'User',
    });

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
      '[audit:role_update] Aktion Role Update (Update) • Ziel [Role]: Example Rolle (2222) • Änderungen: name: Alte Rolle → Neue Rolle; permissions: {"allow":"8"}',
    );
    expect(metadata).toEqual({
      action: 'role_update',
      actionType: 'Update',
      actorId: '1111',
      entryId: 'log-entry-1',
      guildId: '999',
      reason: 'Routine-Anpassung',
      targetId: '2222',
      targetType: 'Role',
    });

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
