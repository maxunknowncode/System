import { brandTitle, coreEmbed } from '../../../util/embeds/core.js';

const ACTION_LABELS = {
  en: {
    BAN: 'Ban',
    UNBAN: 'Unban',
    TIMEOUT: 'Timeout',
    KICK: 'Kick',
    WARN: 'Warning',
  },
  de: {
    BAN: 'Bann',
    UNBAN: 'Entbannung',
    TIMEOUT: 'Timeout',
    KICK: 'Kick',
    WARN: 'Verwarnung',
  },
};

export async function sendUserDM(userId, payload, lang = 'en') {
  const language = lang === 'de' ? 'de' : 'en';
  const { client, guildName, actionType, reasonText, durationText, caseId } = payload;
  if (!client) {
    return false;
  }

  try {
    const user = await client.users.fetch(userId);
    const actionLabel = ACTION_LABELS[language][actionType] ?? actionType;
    const embed = coreEmbed('ANN', language)
      .setTitle(brandTitle(actionLabel))
      .setDescription(
        language === 'de'
          ? `Du erhältst diese Nachricht vom Server **${guildName}**.`
          : `You are receiving this message from **${guildName}**.`
      )
      .addFields(
        language === 'de'
          ? { name: 'Maßnahme', value: actionLabel, inline: true }
          : { name: 'Action', value: actionLabel, inline: true },
        language === 'de'
          ? { name: 'Fallnummer', value: `#${caseId}`, inline: true }
          : { name: 'Case ID', value: `#${caseId}`, inline: true },
        language === 'de'
          ? { name: 'Dauer', value: durationText, inline: true }
          : { name: 'Duration', value: durationText, inline: true },
        language === 'de'
          ? { name: 'Begründung', value: reasonText }
          : { name: 'Reason', value: reasonText }
      );

    await user.send({ embeds: [embed] });
    return true;
  } catch {
    return false;
  }
}
