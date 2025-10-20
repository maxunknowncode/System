import { TICKET_PANEL_CHANNEL_ID, TICKET_PANEL_MESSAGE_ID, MENU_CUSTOM_ID } from './config.js';
import { buildTicketPanel } from './panel.js';
import { logger } from '../../util/logging/logger.js';
import { BRAND_PREFIX } from '../../config/branding.js';

const ticketLogger = logger.withPrefix('tickets:ensure');
const TICKET_AUTHOR_NAMES = [
  `${BRAND_PREFIX}Ticket System`,
  `${BRAND_PREFIX}Ticketsystem`,
];

export async function ensureTicketPanel(client) {
  let channel;
  try {
    channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
  } catch (err) {
    ticketLogger.error('Panel-Kanal konnte nicht abgerufen werden:', err);
    return;
  }
  if (!channel || !channel.isTextBased()) return;

  const payload = { ...buildTicketPanel(), allowedMentions: { parse: [] } };
  let message = null;

  try {
    message = await channel.messages.fetch(TICKET_PANEL_MESSAGE_ID);
  } catch (err) {
    ticketLogger.warn('Panel-Nachricht nicht gefunden:', err);
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 20 });
      message = messages.find(
        (m) =>
          m.author.id === client.user.id &&
          (m.components.some((row) => row.components.some((c) => c.customId === MENU_CUSTOM_ID)) ||
            m.embeds.some((e) => e.author?.name && TICKET_AUTHOR_NAMES.includes(e.author.name)))
      );
    } catch (err) {
      ticketLogger.error('Nachrichten konnten nicht geladen werden:', err);
    }
  }

  if (message) {
    try {
      await message.edit(payload);
      ticketLogger.info('Panel aktualisiert');
    } catch (err) {
      ticketLogger.error('Panel konnte nicht aktualisiert werden:', err);
    }
  } else {
    try {
      await channel.send(payload);
      ticketLogger.info('Panel erstellt');
    } catch (err) {
      ticketLogger.error('Panel konnte nicht erstellt werden:', err);
    }
  }
}
