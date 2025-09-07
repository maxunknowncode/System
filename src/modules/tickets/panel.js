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
    .setTitle('🎫 Ticket System')
    .setDescription(
      `🇩🇪 Deutsch\nWähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!\n\n` +
        `🇺🇸 English\nSelect which type of ticket you would like to open in the dropdown menu!\n\n` +
        `_Create a ticket by selecting an option from the dropdown menu._`
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
