import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { logger } from '../src/util/logger.js';

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  logger.error('[register] Missing TOKEN/CLIENT_ID/GUILD_ID');
  process.exit(1);
}

const baseDir = path.join(process.cwd(), 'src', 'commands');

async function collect(dir, acc = []) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  const names = entries.map((e) => e.name);
  const file = names.includes('command.js')
    ? 'command.js'
    : names.includes('index.js')
      ? 'index.js'
      : null;

  if (file) {
    const filePath = path.join(dir, file);
    try {
      const mod = (await import(filePath)).default;
      if (mod?.name && mod?.description) {
        const data = { name: mod.name, description: mod.description };
        if (mod.options) data.options = mod.options;
        if (mod.defaultMemberPermissions !== undefined) data.default_member_permissions = mod.defaultMemberPermissions;
        if (mod.dmPermission !== undefined) data.dm_permission = mod.dmPermission;
        acc.push(data);
        }
      } catch {
        // ignore
      }
  } else {
    for (const entry of entries.filter((e) => e.isDirectory())) {
      await collect(path.join(dir, entry.name), acc);
    }
  }
  return acc;
}

  (async () => {
    const commands = await collect(baseDir);
    const rest = new REST({ version: '10' }).setToken(token);

    const normalize = (cmd) => {
      const obj = { name: cmd.name, description: cmd.description };
      if (cmd.options) obj.options = cmd.options;
      if (cmd.default_member_permissions !== undefined)
        obj.default_member_permissions = cmd.default_member_permissions;
      if (cmd.dm_permission !== undefined) obj.dm_permission = cmd.dm_permission;
      return JSON.stringify(obj);
    };

    let existing = [];
    try {
      existing = await rest.get(
        Routes.applicationGuildCommands(clientId, guildId)
      );
    } catch (err) {
      logger.error('[register] Failed to fetch current guild commands:', err);
      process.exit(1);
    }

    const oldMap = new Map(existing.map((c) => [c.name, normalize(c)]));
    const newMap = new Map(commands.map((c) => [c.name, normalize(c)]));
    let added = 0;
    let removed = 0;
    let changed = 0;
    for (const [name, hash] of newMap) {
      if (!oldMap.has(name)) added++;
      else if (oldMap.get(name) !== hash) changed++;
    }
    for (const name of oldMap.keys()) {
      if (!newMap.has(name)) removed++;
    }

    logger.info(
      `[register] Registering ${commands.length} command(s) to guild ${guildId}…`
    );
    try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
        body: commands,
      });
        logger.info(`[register] Guild commands registered: total ${commands.length} (added ${added}, removed ${removed}, changed ${changed})`);
    } catch (err) {
      logger.error('[register] Failed to register guild commands:', err);
      process.exit(1);
    }
  })();
