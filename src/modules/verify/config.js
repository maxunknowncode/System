/*
### Zweck: Hält IDs/Konstanten für das Verify-Feature (Channel, Rolle, Buttons, Sprache).
*/
import { CHANNEL_IDS, MESSAGE_IDS, ROLE_IDS } from '../../config/ids.js';

export const VERIFY_CHANNEL_ID = CHANNEL_IDS.verify;
export const VERIFY_MESSAGE_ID = MESSAGE_IDS.verify;
export const VERIFY_ROLE_ID = ROLE_IDS.verify;
export const VERIFY_BUTTON_ID = 'verify_action';
export const VERIFY_LANG_EN_ID = 'verify_lang_en';
export const VERIFY_LANG_DE_ID = 'verify_lang_de';
export const VERIFY_DEFAULT_LANG = 'en';
export const VERIFY_RESET_MS = 300000;
