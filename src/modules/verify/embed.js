/*
### Zweck: Baut die zweisprachige Verify-Embed und den grünen Verify-Button.
*/
import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { VERIFY_BUTTON_ID, VERIFY_EMOJI } from './config.js';

export function buildVerifyEmbedAndComponents() {
  const embed = new EmbedBuilder()
    .setColor(0xFFD700)
    .setTitle('<a:verify:1355265228862001202> Verify — Verifizierung')
    .setDescription(`**Verify here**
*Press the green button to confirm you’re **not a bot** and unlock the server.*

**Hier musst du dich verifizieren**
*Klicke auf den grünen Button, um zu bestätigen, dass du **kein Bot** bist und den Server freizuschalten.*`)
    .addFields(
      { name: 'What you get', value: 'Access to channels and roles like <@&1354909911691038862>.' },
      { name: 'Was du bekommst', value: 'Zugriff auf Kanäle und Rollen wie <@&1354909911691038862>.' }
    )
    .setFooter(FOOTER);

  const button = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
    .setEmoji({ ...VERIFY_EMOJI, name: 'verify' });

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}
