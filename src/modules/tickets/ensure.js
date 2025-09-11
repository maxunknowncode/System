import { TICKET_PANEL_CHANNEL_ID, TICKET_PANEL_MESSAGE_ID, MENU_CUSTOM_ID } from './config.js';
import { buildTicketPanel } from './panel.js';
import { logger } from '../../util/logger.js';

export async function ensureTicketPanel(client) {
  let channel;
  try {
    channel = await client.channels.fetch(TICKET_PANEL_CHANNEL_ID);
  } catch {
    return;
  }
  if (!channel || !channel.isTextBased()) return;

  const payload = { ...buildTicketPanel(), allowedMentions: { parse: [] } };
  let message = null;

  try {
    message = await channel.messages.fetch(TICKET_PANEL_MESSAGE_ID);
  } catch {}

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 20 });
        message = messages.find(
          (m) =>
            m.author.id === client.user.id &&
            (m.components.some((row) => row.components.some((c) => c.customId === MENU_CUSTOM_ID)) ||
              m.embeds.some((e) => e.author?.name === 'The Core - Ticket System'))
        );
      } catch {}
    }

  if (message) {
    try {
      await message.edit(payload);
      logger.info('[tickets] Panel aktualisiert');
    } catch {}
  } else {
    try {
      await channel.send(payload);
      logger.info('[tickets] Panel erstellt');
    } catch {}
  }
}
