/*
### Zweck: Hält IDs/Konstanten für das Suggestions-Feature.
*/
import { CHANNEL_IDS } from '../../config/ids.js';

export const SUGGESTIONS_CHANNEL_ID = CHANNEL_IDS.suggestions;
export const SUGGESTIONS_EMOJI_UP = "✅";
export const SUGGESTIONS_EMOJI_DOWN = "❌";
export const SUGGESTIONS_IGNORE_BOTS = true;
// Bot braucht in diesem Channel Add Reactions und Read Message History.
