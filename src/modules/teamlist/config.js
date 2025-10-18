/*
### Zweck: Hält IDs/Konstanten für die Teamliste.
*/
import { CHANNEL_IDS, MESSAGE_IDS, ROLE_IDS } from '../../config/ids.js';

export const TEAM_CHANNEL_ID = CHANNEL_IDS.teamList;
export const TEAM_MESSAGE_ID = MESSAGE_IDS.teamList;
export const TEAM_BUTTON_ID_EN = "team_lang_en";
export const TEAM_BUTTON_ID_DE = "team_lang_de";
export const TEAM_RESET_MS = 300000;
export const TEAM_ROLES = [
  { id: ROLE_IDS.teamOwner,             labelEn: "Owner",              labelDe: "Owner",
    descEn: "Ultimate authority & strategic leadership",
    descDe: "Oberste Instanz & strategische Leitung" },
  { id: ROLE_IDS.teamCoOwner,           labelEn: "Co-Owner",           labelDe: "Co-Owner",
    descEn: "Shares ownership & backs key decisions",
    descDe: "Teilt Verantwortung & unterstützt Kernentscheidungen" },
  { id: ROLE_IDS.teamManager,           labelEn: "Manager",            labelDe: "Manager",
    descEn: "Oversees departments & ensures execution",
    descDe: "Überblickt Bereiche & sorgt für Umsetzung" },
  { id: ROLE_IDS.teamHeadAdministrator, labelEn: "Head Administrator", labelDe: "Head Administrator",
    descEn: "Leads admin team & handles complex issues",
    descDe: "Leitet Admin-Team & bearbeitet komplexe Fälle" },
  { id: ROLE_IDS.teamAdministrator,     labelEn: "Administrator",      labelDe: "Administrator",
    descEn: "Manages escalations & advanced moderation",
    descDe: "Verwaltet Eskalationen & fortgeschrittene Moderation" },
  { id: ROLE_IDS.teamManagement,        labelEn: "Team Management",    labelDe: "Team Management",
    descEn: "Coordinates internal projects & schedules",
    descDe: "Koordiniert interne Projekte & Zeitpläne" },
  { id: ROLE_IDS.teamHeadModerator,     labelEn: "Head Moderator",     labelDe: "Head Moderator",
    descEn: "Guides moderators & sets moderation standards",
    descDe: "Führt Moderatoren & setzt Moderationsstandards" },
  { id: ROLE_IDS.teamModerator,         labelEn: "Moderator",          labelDe: "Moderator",
    descEn: "Keeps chats safe & enforces rules",
    descDe: "Hält Chats sicher & setzt Regeln durch" },
  { id: ROLE_IDS.teamSupporter,         labelEn: "Supporter",          labelDe: "Supporter",
    descEn: "Answers member questions & provides help",
    descDe: "Beantwortet Mitgliederfragen & bietet Hilfe" },
  { id: ROLE_IDS.teamTestSupporter,     labelEn: "Test Supporter",     labelDe: "Test Supporter",
    descEn: "Trains as support & covers trials",
    descDe: "Lernt Supportaufgaben & begleitet Testphase" },
  { id: ROLE_IDS.teamDeveloper,         labelEn: "Developer",          labelDe: "Entwickler",
    descEn: "Builds systems & maintains automation",
    descDe: "Entwickelt Systeme & pflegt Automatisierung" },
];
