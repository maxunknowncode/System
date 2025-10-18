/*
### Zweck: Hält nur IDs/Konstanten für das Rules-Feature (Channel, Nachricht, Buttons, Default-Sprache, Reset-Zeit).
*/
import { CHANNEL_IDS, MESSAGE_IDS } from '../../config/ids.js';

export const RULES_CHANNEL_ID = CHANNEL_IDS.rules;
export const RULES_MESSAGE_ID = MESSAGE_IDS.rules;
export const RULES_BUTTON_ID_EN = 'rules_lang_en';
export const RULES_BUTTON_ID_DE = 'rules_lang_de';
export const RULES_DEFAULT_LANG = 'en';
export const RULES_RESET_MS = 300000;
