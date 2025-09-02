/*
### Zweck: Reagiert auf neue Nachrichten im Vorschlagskanal und setzt Abstimmungsreaktionen.
*/
import { Events } from 'discord.js';
import { logger } from '../../util/logger.js';
import {
  SUGGESTIONS_CHANNEL_ID,
  SUGGESTIONS_EMOJI_UP,
  SUGGESTIONS_EMOJI_DOWN,
  SUGGESTIONS_IGNORE_BOTS,
} from '../../modules/suggestions/config.js';

export default {
  name: Events.MessageCreate,
  once: false,
  async execute(message) {
    if (SUGGESTIONS_IGNORE_BOTS && message.author?.bot) return;
    if (message.channelId !== SUGGESTIONS_CHANNEL_ID) return;
    if (!message.guild?.members.me?.permissionsIn(message.channelId).has(['AddReactions', 'ReadMessageHistory'])) return;
    try {
      await message.react(SUGGESTIONS_EMOJI_UP);
      await message.react(SUGGESTIONS_EMOJI_DOWN);
    } catch (err) {
      logger.warn('[suggestions] Reactions failed:', err?.code ?? err?.message);
    }
  },
};
