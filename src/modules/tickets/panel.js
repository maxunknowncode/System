import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { MENU_CUSTOM_ID, MENU_PLACEHOLDER, MENU_OPTION_SUPPORT } from './config.js';

export function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Create Ticket — Support | Ticket erstellen — Support')
    .setDescription(
      `**English**\n• Choose a category below to open a support ticket.\n\n` +
        `**Deutsch**\n• Wähle unten eine Kategorie, um ein Support-Ticket zu eröffnen.`
    )
    .setFooter(FOOTER);

  const option = new StringSelectMenuOptionBuilder()
    .setValue(MENU_OPTION_SUPPORT.value)
    .setLabel(MENU_OPTION_SUPPORT.label)
    .setDescription(MENU_OPTION_SUPPORT.description)
    .setEmoji(MENU_OPTION_SUPPORT.emoji);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(MENU_CUSTOM_ID)
    .setPlaceholder(MENU_PLACEHOLDER)
    .addOptions(option);

  const row = new ActionRowBuilder().addComponents(menu);
  return { embeds: [embed], components: [row] };
}
