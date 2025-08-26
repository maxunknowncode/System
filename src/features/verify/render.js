import { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { VERIFY_BUTTON_ID, VERIFY_EMOJI } from './config.js';

export function renderVerifyMessage() {
  const embed = new EmbedBuilder()
    .setColor(0x00ff00)
    .setTitle('Verification')
    .setDescription('Click the button to verify.\nKlicke den Button, um dich zu verifizieren.')
    .setFooter(FOOTER);

  const button = new ButtonBuilder()
    .setCustomId(VERIFY_BUTTON_ID)
    .setLabel('Verify')
    .setStyle(ButtonStyle.Success)
    .setEmoji(VERIFY_EMOJI);

  const row = new ActionRowBuilder().addComponents(button);

  return { embeds: [embed], components: [row] };
}
