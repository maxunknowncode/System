import { CHANNEL_IDS, MESSAGE_IDS, CATEGORY_IDS, ROLE_IDS } from '../../config/ids.js';

export const TICKET_PANEL_CHANNEL_ID    = CHANNEL_IDS.ticketPanel; // "Create Ticket"
export const TICKET_PANEL_MESSAGE_ID    = MESSAGE_IDS.ticketPanel; // bestehende Panel-Message
export const TICKET_ACTIVE_CATEGORY_ID  = CATEGORY_IDS.ticketActive; // Aktive Tickets
export const TICKET_ARCHIVE_CATEGORY_ID = CATEGORY_IDS.ticketArchive; // Archiv-Tickets
export const TEAM_ROLE_ID               = ROLE_IDS.team; // Team

export const MENU_CUSTOM_ID = "ticket_menu_single";
export const MENU_PLACEHOLDER = "Select your ticket type.";
export const MENU_OPTION_EN = {
  value: "support_en",
  label: "General Support",
  description: "General questions & problems",
  emoji: "🇺🇸",
};
export const MENU_OPTION_DE = {
  value: "support_de",
  label: "Allgemeiner Support",
  description: "Allgemeine Fragen und Probleme",
  emoji: "🇩🇪",
};

export const BTN_CLAIM_ID               = "ticket_claim";            // ✅ Claim
export const BTN_CLOSE_ID               = "ticket_close";            // 🔒 Close (Start)
export const BTN_CLOSE_CONFIRM_ID       = "ticket_close_confirm";    // ✅ Confirm Close
export const BTN_REOPEN_ID              = "ticket_reopen";           // 🔓 Reopen (nach Close)
export const BTN_REOPEN_CONFIRM_ID      = "ticket_reopen_confirm";   // ✅ Confirm Reopen
export const BTN_DELETE_ID              = "ticket_delete";           // 🗑️ Delete (nach Close)
export const BTN_DELETE_CONFIRM_ID      = "ticket_delete_confirm";   // ✅ Confirm Delete

export const TICKET_CHANNEL_PREFIX      = "ticket";
