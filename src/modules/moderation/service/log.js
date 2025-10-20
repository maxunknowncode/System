import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { brandTitle, coreEmbed } from '../../../util/embeds/core.js';
import { MOD_LOG_CHANNEL_ID } from '../config.js';

const DM_STATUS = {
  en: {
    true: 'Delivered',
    false: 'Failed',
  },
  de: {
    true: 'Zugestellt',
    false: 'Fehlgeschlagen',
  },
};

export async function sendModLog(guild, data, lang = 'en') {
  if (!guild) return false;
  const language = lang === 'de' ? 'de' : 'en';
  const channel = await guild.channels.fetch(MOD_LOG_CHANNEL_ID).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return false;
  }

  const embed = coreEmbed('LOGS', language);

  const startUnix = data.startTs ? Math.floor(data.startTs.getTime() / 1000) : null;
  const endUnix = data.endTs ? Math.floor(data.endTs.getTime() / 1000) : null;

  const userField = {
    name: language === 'de' ? 'Mitglied' : 'User',
    value: data.target
      ? `${data.target.tag ? `${data.target.tag}\n` : ''}<@${data.target.id}> (${data.target.id})`
      : data.targetId
        ? `<@${data.targetId}> (${data.targetId})`
        : 'Unknown',
    inline: false,
  };

  const moderatorField = {
    name: language === 'de' ? 'Moderator' : 'Moderator',
    value: data.moderator
      ? `${data.moderator.tag ? `${data.moderator.tag}\n` : ''}<@${data.moderator.id}> (${data.moderator.id})`
      : 'Unknown',
    inline: false,
  };

  const dmKey = String(Boolean(data.dmOk));
  const dmText = DM_STATUS[language]?.[dmKey] ?? (language === 'de' ? 'Fehlgeschlagen' : 'Failed');

  embed
    .setTitle(brandTitle(`${data.actionType} • Case #${data.caseId}`))
    .addFields(
      userField,
      moderatorField,
      startUnix
        ? {
            name: language === 'de' ? 'Start' : 'Start',
            value: `<t:${startUnix}:F> • <t:${startUnix}:R>`,
            inline: true,
          }
        : {
            name: language === 'de' ? 'Start' : 'Start',
            value: '—',
            inline: true,
          },
      data.permanent
        ? {
            name: language === 'de' ? 'Dauer' : 'Duration',
            value: language === 'de' ? 'Permanent' : 'Permanent',
            inline: true,
          }
        : endUnix
          ? {
              name: language === 'de' ? 'Ende' : 'End',
              value: `<t:${endUnix}:F> • <t:${endUnix}:R>`,
              inline: true,
            }
          : {
              name: language === 'de' ? 'Ende' : 'End',
              value: '—',
              inline: true,
            },
      {
        name: language === 'de' ? 'Grund' : 'Reason',
        value: data.reasonText || '—',
        inline: false,
      },
      {
        name: language === 'de' ? 'DM' : 'DM',
        value: dmText,
        inline: true,
      },
      {
        name: 'Audit',
        value: data.auditId ? data.auditId : '—',
        inline: true,
      }
    );

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel(language === 'de' ? 'Profil öffnen' : 'Open Profile')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/users/${data.target?.id ?? data.targetId}`)
  );

  try {
    await channel.send({ embeds: [embed], components: [row] });
    return true;
  } catch {
    return false;
  }
}
