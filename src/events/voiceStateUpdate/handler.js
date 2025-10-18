import { PermissionFlagsBits } from 'discord.js';
import { ChannelType } from 'discord.js';
import { JOIN_TO_CREATE_CHANNEL_ID } from '../../modules/join2create/config.js';
import { ROLE_IDS } from '../../config/ids.js';
import { logger } from '../../util/logging/logger.js';

const joinLogger = logger.withPrefix('join2create:handler');

const createdChannels = new Set();

export default {
  name: 'voiceStateUpdate',
  async execute(oldState, newState) {
    try {
      if (newState.channelId === JOIN_TO_CREATE_CHANNEL_ID) {
        const base = newState.channel;
        const member = newState.member;
        if (!base || base.type !== ChannelType.GuildVoice) {
          joinLogger.warn('Basis-Kanal für Join-to-Create nicht verfügbar.');
          return;
        }
        if (!member) {
          joinLogger.warn('Mitglied konnte nicht ermittelt werden.');
          return;
        }

        try {
          const cloned = await base.clone({
            name: `🔊 ${member.displayName ?? member.user.username}`,
            parent: base.parentId,
            bitrate: base.bitrate,
            userLimit: base.userLimit,
            reason: 'Join to Create',
          });
          createdChannels.add(cloned.id);
          try {
            await cloned.permissionOverwrites.edit(member, {
              ManageChannels: true,
              Connect: true,
              Speak: true,
              UseVAD: true,
            });
          } catch (err) {
            joinLogger.warn('Mitglieds-Berechtigungen konnten nicht gesetzt werden:', err);
          }
          try {
            await cloned.permissionOverwrites.edit(ROLE_IDS.verify, {
              Connect: true,
              Speak: true,
              UseVAD: true,
            });
          } catch (err) {
            joinLogger.warn('Rollen-Berechtigungen konnten nicht gesetzt werden:', err);
          }

          try {
            await newState.setChannel(cloned);
            joinLogger.info(`Temporären Kanal ${cloned.id} für ${member.user.tag} erstellt.`);
          } catch (err) {
            joinLogger.error('Mitglied konnte nicht verschoben werden:', err);
          }
        } catch (err) {
          joinLogger.error('Clonen des Join-to-Create-Kanals fehlgeschlagen:', err);
        }
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
