import {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import {
  MENU_EN_CUSTOM_ID,
  MENU_DE_CUSTOM_ID,
  MENU_EN_PLACEHOLDER,
  MENU_DE_PLACEHOLDER,
} from './config.js';

export function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Ticket System')
    .setDescription(
      `🇺🇸 English\nSelect which type of ticket you would like to open in the dropdown menu!\n\n` +
        `🇩🇪 Deutsch\nWähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!\n\n` +
        `_Create a ticket by selecting an option from the dropdown menu._`
    )
    .setFooter(FOOTER);

  const enOption = new StringSelectMenuOptionBuilder()
    .setLabel('Support')
    .setValue('support_en')
    .setDescription('General questions & problems')
    .setEmoji('🇺🇸');

  const enMenu = new StringSelectMenuBuilder()
    .setCustomId(MENU_EN_CUSTOM_ID)
    .setPlaceholder(MENU_EN_PLACEHOLDER)
    .addOptions(enOption);

  const deOption = new StringSelectMenuOptionBuilder()
    .setLabel('Support (Deutsch)')
    .setValue('support_de')
    .setDescription('Allgemeine Fragen & Probleme')
    .setEmoji('🇩🇪');

  const deMenu = new StringSelectMenuBuilder()
    .setCustomId(MENU_DE_CUSTOM_ID)
    .setPlaceholder(MENU_DE_PLACEHOLDER)
    .addOptions(deOption);

  const enRow = new ActionRowBuilder().addComponents(enMenu);
  const deRow = new ActionRowBuilder().addComponents(deMenu);

  return { embeds: [embed], components: [enRow, deRow] };
}
