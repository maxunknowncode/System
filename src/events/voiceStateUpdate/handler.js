import { PermissionFlagsBits } from 'discord.js';
import { JOIN_TO_CREATE_CHANNEL_ID } from '../../modules/join2create/config.js';
import { logger } from '../../util/logger.js';

const joinLogger = logger.withPrefix('join2create');

const createdChannels = new Set();

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      if (newState.channelId === JOIN_TO_CREATE_CHANNEL_ID) {
        const base = newState.channel;
        const member = newState.member;
        const channel = await base.clone({
          name: `🔊 ${member.user.username}`,
          reason: 'Join to Create',
        });
        await channel.permissionOverwrites.edit(member, {
          ManageChannels: true,
        });
        createdChannels.add(channel.id);
        await newState.setChannel(channel);
        joinLogger.debug(`Created channel ${channel.id} for ${member.user.tag}`);
      }
      if (oldState.channelId && createdChannels.has(oldState.channelId)) {
        const channel = oldState.guild.channels.cache.get(oldState.channelId);
        if (channel && channel.members.size === 0) {
          await channel.delete().catch((err) => joinLogger.warn('Fehler beim Löschen:', err));
          createdChannels.delete(oldState.channelId);
        }
      }
    } catch (err) {
      joinLogger.error('Fehler:', err);
    }
  },
};
