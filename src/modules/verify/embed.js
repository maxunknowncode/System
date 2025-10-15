/*
### Zweck: Baut die Verify-Embed samt Sprach- und Verify-Buttons.
*/
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { BRAND_NAME } from '../../util/embeds/brand.js';
import { coreEmbed } from '../../util/embeds/core.js';
import {
  VERIFY_BUTTON_ID,
  VERIFY_LANG_EN_ID,
  VERIFY_LANG_DE_ID,
  VERIFY_DEFAULT_LANG,
  VERIFY_ROLE_ID,
} from './config.js';

export function buildVerifyEmbedAndComponents(lang = VERIFY_DEFAULT_LANG) {
  const isDe = lang === 'de';

  const title = isDe
    ? '✅ Verifizierung — Zugriff auf den Server'
    : '✅ Verify — Access the Server';

  const description = isDe
    ? `🛡️ *Offizielle Verifizierung von **${BRAND_NAME} Team** — bitte bestätige, dass du kein Bot bist.*`
    : `🛡️ *Official verification by **${BRAND_NAME} Team** — please confirm you’re not a bot.*`;

  const fields = isDe
    ? [
        {
          name: '🎯 __**Was passiert**__',
          value: `> Du schaltest Kanäle & Rollen frei, z. B. <@&${VERIFY_ROLE_ID}>.`,
        },
        {
          name: 'ℹ️ __**So geht’s**__',
          value: '> Klicke **Verify**. Geht sofort und ist sicher.',
        },
      ]
    : [
        {
          name: '🎯 __**What happens**__',
          value: `> You unlock channels & roles like <@&${VERIFY_ROLE_ID}>.`,
        },
        {
          name: 'ℹ️ __**How to**__',
          value: '> Press **Verify**. It’s instant and safe.',
        },
      ];

  const embed = coreEmbed('VERIFY', lang)
    .setTitle(title)
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
