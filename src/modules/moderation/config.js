import { CHANNEL_IDS, ROLE_IDS } from '../../config/ids.js';

export const MOD_LOG_CHANNEL_ID = CHANNEL_IDS.moderationLog;
export const TEAM_ROLE_ID = ROLE_IDS.team;
export const BAN_PRESETS = ['1d', '3d', '7d', '14d', '30d', 'permanent'];
export const TIMEOUT_PRESETS = ['10m', '1h', '1d', '3d', '7d'];
export const REASON_CODES = ['SPAM', 'HARASS', 'NSFW', 'ALT', 'D0X', 'CUSTOM'];

export const REASON_LABELS = {
  en: {
    SPAM: 'Spam / Flooding',
    HARASS: 'Harassment',
    NSFW: 'NSFW Content',
    ALT: 'Alt Account',
    D0X: 'Doxxing',
    CUSTOM: 'Custom Reason',
  },
  de: {
    SPAM: 'Spam / Flood',
    HARASS: 'Belästigung',
    NSFW: 'NSFW-Inhalte',
    ALT: 'Alt-Account',
    D0X: 'Doxxing',
    CUSTOM: 'Eigener Grund',
  },
};
