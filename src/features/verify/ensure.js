import { VERIFY_CHANNEL_ID, VERIFY_MESSAGE_ID, VERIFY_BUTTON_ID } from './config.js';
import { renderVerifyMessage } from './render.js';

export default async function ensureVerifyMessage(client) {
  const channel = await client.channels.fetch(VERIFY_CHANNEL_ID).catch((err) => {
    console.error('[verify] Failed to fetch verify channel:', err);
    return null;
  });
  if (!channel || !channel.isTextBased()) {
    console.warn('[verify] Verify channel not found or not text-based');
    return;
  }

  const payload = renderVerifyMessage();
  let message = null;

  if (VERIFY_MESSAGE_ID) {
    try {
      message = await channel.messages.fetch(VERIFY_MESSAGE_ID);
    } catch {
      // ignore
    }
  }

  if (!message) {
    try {
      const messages = await channel.messages.fetch({ limit: 10 });
      message = messages.find((m) =>
        m.components.some((row) =>
          row.components.some((c) => c.customId === VERIFY_BUTTON_ID)
        )
      );
    } catch (err) {
      console.error('[verify] Failed to search verify message:', err);
    }
  }

  if (message) {
    try {
      await message.edit(payload);
    } catch (err) {
      console.error('[verify] Failed to edit verify message:', err);
    }
  } else {
    try {
      await channel.send(payload);
    } catch (err) {
      console.error('[verify] Failed to send verify message:', err);
    }
  }
}
