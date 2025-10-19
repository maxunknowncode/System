/*
### Zweck: Baut die Verify-Embed samt Sprach- und Verify-Buttons.
*/
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { BRAND_NAME } from '../../config/branding.js';
import { brandTitle, coreEmbed } from '../../util/embeds/core.js';
import { VERIFY_MESSAGES, resolveFields, resolveText } from '../../i18n/messages.js';
import {
  VERIFY_BUTTON_ID,
  VERIFY_LANG_EN_ID,
  VERIFY_LANG_DE_ID,
  VERIFY_DEFAULT_LANG,
  VERIFY_ROLE_ID,
} from './config.js';

export function buildVerifyEmbedAndComponents(lang = VERIFY_DEFAULT_LANG) {
  const replacements = { brand: BRAND_NAME, verifyRoleId: VERIFY_ROLE_ID };

  const title = resolveText(VERIFY_MESSAGES.embed.title, lang, replacements);
  const description = resolveText(VERIFY_MESSAGES.embed.description, lang, replacements);
  const fields = resolveFields(VERIFY_MESSAGES.embed.fields, lang, replacements);

  const embed = coreEmbed('VERIFY', lang)
    .setTitle(brandTitle(title))
    .setDescription(description)
    .addFields(fields);

  // ✅ Verify-Button (grün)
  const verifyButton = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
    .setEmoji({ id: '1355265228862001202', name: 'verify', animated: true });

  const row1 = new ActionRowBuilder().addComponents(verifyButton);

  // 🌐 Sprach-Buttons: Flag + Text
  const langEnButton = new ButtonBuilder()
    .setCustomId(VERIFY_LANG_EN_ID)
    .setLabel('English')
    .setStyle(ButtonStyle.Primary)
    .setEmoji('🇺🇸');

  const langDeButton = new ButtonBuilder()
    .setCustomId(VERIFY_LANG_DE_ID)
    .setLabel('Deutsch')
    .setStyle(ButtonStyle.Secondary)
    .setEmoji('🇩🇪');

  const row2 = new ActionRowBuilder().addComponents(langEnButton, langDeButton);

  return { embeds: [embed], components: [row1, row2] };
}
