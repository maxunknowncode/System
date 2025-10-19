/*
### Zweck: Baut die Rules-Embed und die Sprachwahl-Buttons.
*/
import { ButtonBuilder, ActionRowBuilder, ButtonStyle } from "discord.js";
import { BRAND_NAME } from "../../config/branding.js";
import { brandTitle, coreEmbed } from "../../util/embeds/core.js";
import { RULES_BUTTON_ID_EN, RULES_BUTTON_ID_DE } from "./config.js";
import { RULES_MESSAGES, resolveFields, resolveText } from "../../i18n/messages.js";

export function buildRulesEmbedAndComponents(lang = "en") {
  const replacements = { brand: BRAND_NAME };
  const title = resolveText(RULES_MESSAGES.title, lang, replacements);
  const description = resolveText(RULES_MESSAGES.description, lang, replacements);
  const fields = resolveFields(RULES_MESSAGES.fields, lang, replacements);

  const embed = coreEmbed("RULES", lang)
    .setTitle(brandTitle(title))
    .setDescription(description)
    .setFields(fields);

  const enButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_EN)
    .setLabel("English")
    .setStyle(ButtonStyle.Primary)
    .setEmoji("🇺🇸");

  const deButton = new ButtonBuilder()
    .setCustomId(RULES_BUTTON_ID_DE)
    .setLabel("Deutsch")
    .setStyle(ButtonStyle.Secondary)
    .setEmoji("🇩🇪");

  const row = new ActionRowBuilder().addComponents(enButton, deButton);

  return { embeds: [embed], components: [row] };
}
