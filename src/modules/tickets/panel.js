import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { FOOTER } from '../../util/embeds/footer.js';
import { applyAuthor } from '../../util/embeds/author.js';
import { COLOR } from '../../util/embeds/color.js';
import { MENU_CUSTOM_ID, MENU_PLACEHOLDER, MENU_OPTION_EN, MENU_OPTION_DE } from './config.js';

export function buildTicketPanel() {
  const embed = applyAuthor(new EmbedBuilder(), 'TICKET')
    .setDescription(
      `🇺🇸 **English**\n> Select which type of ticket you would like to open in the dropdown menu!\n\n` +
        `🇩🇪 **Deutsch**\n> Wähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!`
    )
    .setColor(COLOR)
    .setFooter(FOOTER);

  const optionEN = new StringSelectMenuOptionBuilder()
    .setValue(MENU_OPTION_EN.value)
    .setLabel(MENU_OPTION_EN.label)
    .setDescription(MENU_OPTION_EN.description)
    .setEmoji(MENU_OPTION_EN.emoji);

  const optionDE = new StringSelectMenuOptionBuilder()
    .setValue(MENU_OPTION_DE.value)
    .setLabel(MENU_OPTION_DE.label)
    .setDescription(MENU_OPTION_DE.description)
    .setEmoji(MENU_OPTION_DE.emoji);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(MENU_CUSTOM_ID)
    .setPlaceholder(MENU_PLACEHOLDER)
    .addOptions(optionEN, optionDE);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
