/*
  Bot braucht: ManageChannels, ViewChannel, SendMessages, ReadMessageHistory, AddReactions (optional).
  Für Pings: MentionEveryone nicht nötig, aber allowedMentions setzen.
*/

export const TICKET_PANEL_CHANNEL_ID   = "1354917224669773895";    // "Create Ticket"
export const TICKET_PANEL_MESSAGE_ID   = "";                       // hier die Panel-Message-ID eintragen, falls bekannt
export const TICKET_ACTIVE_CATEGORY_ID = "1357069606455345483";    // aktive Tickets
export const TICKET_ARCHIVE_CATEGORY_ID = "1357069661505589268";   // Archiv-Kategorie-ID
export const TEAM_ROLE_ID              = "1354916696527208693";    // "Team"

export const MENU_CUSTOM_ID            = "ticket_menu";
export const MENU_PLACEHOLDER          = "Create Ticket";
export const MENU_OPTION_SUPPORT       = { label: "Support", value: "support", emoji: "🆘" };

export const BTN_CLAIM_ID              = "ticket_claim";
export const BTN_CLOSE_ID              = "ticket_close";
export const BTN_DELETE_ID             = "ticket_delete";
export const BTN_ACK_PRIVATE_ID        = "ticket_ack_private";     // "Privat wieder bestätigen"

export const TICKET_CHANNEL_PREFIX     = "ticket";
