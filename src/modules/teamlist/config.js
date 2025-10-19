/*
### Zweck: Hält IDs/Konstanten für die Teamliste.
*/
import { CHANNEL_IDS, MESSAGE_IDS, ROLE_IDS } from '../../config/ids.js';

export const TEAM_CHANNEL_ID = CHANNEL_IDS.teamList;
export const TEAM_MESSAGE_ID = MESSAGE_IDS.teamList;
export const TEAM_BUTTON_ID_EN = "team_lang_en";
export const TEAM_BUTTON_ID_DE = "team_lang_de";
export const TEAM_RESET_MS = 300000;

export const TEAM_ROLES = Object.freeze({
  teamOwner: Object.freeze({
    id: ROLE_IDS.teamOwner,
    labelEn: "Owner",
    labelDe: "Owner",
  }),
  teamCoOwner: Object.freeze({
    id: ROLE_IDS.teamCoOwner,
    labelEn: "Co-Owner",
    labelDe: "Co-Owner",
  }),
  teamAdministrator: Object.freeze({
    id: ROLE_IDS.teamAdministrator,
    labelEn: "Administrator",
    labelDe: "Administrator",
  }),
  teamHeadModerator: Object.freeze({
    id: ROLE_IDS.teamHeadModerator,
    labelEn: "Head Moderator",
    labelDe: "Head Moderator",
  }),
  teamModerator: Object.freeze({
    id: ROLE_IDS.teamModerator,
    labelEn: "Moderator",
    labelDe: "Moderator",
  }),
  teamSupporter: Object.freeze({
    id: ROLE_IDS.teamSupporter,
    labelEn: "Support",
    labelDe: "Support",
  }),
  teamDeveloper: Object.freeze({
    id: ROLE_IDS.teamDeveloper,
    labelEn: "Developer",
    labelDe: "Developer",
  }),
  teamEditing: Object.freeze({
    id: ROLE_IDS.teamEditing,
    labelEn: "Editing Team",
    labelDe: "Editing Team",
  }),
  teamEvent: Object.freeze({
    id: ROLE_IDS.teamEvent,
    labelEn: "Event Team",
    labelDe: "Event Team",
  }),
  teamGamingLead: Object.freeze({
    id: ROLE_IDS.teamGamingLead,
    labelEn: "Gaming Lead",
    labelDe: "Gaming Lead",
  }),
});

export const TEAM_ROLES_ORDER = Object.freeze([
  "teamOwner",
  "teamCoOwner",
  "teamAdministrator",
  "teamHeadModerator",
  "teamModerator",
  "teamSupporter",
  "teamDeveloper",
  "teamEditing",
  "teamEvent",
  "teamGamingLead",
]);
