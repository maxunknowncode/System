import { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { FOOTER } from '../../util/footer.js';
import { MENU_CUSTOM_ID, MENU_PLACEHOLDER, MENU_OPTION_EN, MENU_OPTION_DE } from './config.js';

export function buildTicketPanel() {
  const embed = new EmbedBuilder()
    .setAuthor({ name: 'The Core - Ticket System' })
    .setDescription(
      `🇺🇸 **English**\n> Select which type of ticket you would like to open in the dropdown menu!\n\n` +
        `🇩🇪 **Deutsch**\n> Wähle im Dropdown-Menü aus, welche Art von Ticket du öffnen möchtest!`
    )
    .setFooter(FOOTER);

  const menu = new StringSelectMenuBuilder()
    .setCustomId(MENU_CUSTOM_ID)
    .setPlaceholder(MENU_PLACEHOLDER)
    .addOptions(MENU_OPTION_EN, MENU_OPTION_DE);

  const row = new ActionRowBuilder().addComponents(menu);

  return { embeds: [embed], components: [row] };
}
