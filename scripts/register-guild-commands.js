import { REST, Routes } from 'discord.js';
import { readdir } from 'node:fs/promises';
import path from 'node:path';

const token = process.env.TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId || !guildId) {
  console.error('[register] Missing TOKEN/CLIENT_ID/GUILD_ID');
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
  try {
    console.log(`Registering ${commands.length} command(s) to guild ${guildId}…`);
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    console.log('Guild commands registered.');
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
