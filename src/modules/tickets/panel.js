import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { coreEmbed } from '../../util/embeds/core.js';
import { MENU_CUSTOM_ID, MENU_PLACEHOLDER, MENU_OPTION_EN, MENU_OPTION_DE } from './config.js';
import { TICKET_MESSAGES, resolveText } from '../../i18n/messages.js';

export function buildTicketPanel() {
  const embed = coreEmbed('TICKET')
    .setDescription(resolveText(TICKET_MESSAGES.panelDescription));

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
