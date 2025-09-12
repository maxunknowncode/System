export const AUTHOR_ICON =
  "https://cdn.discordapp.com/attachments/1393205203276402768/1415752436676562954/ChatGPT_Image_5._Sept._2025_17_41_03.png?ex=68c5ab34&is=68c459b4&hm=e36e2f2bda07f45f25e7a4953502a233341a16714afc1afa0821d63a88332098&";

export const AUTHORS = {
  TICKET: "The Core - Ticket System",
  VERIFY: "The Core - System",
  RULES: "The Core - Rules | Regelwerk",
  TEAM: "The Core - Team List | Teamliste",
  ANN: "The Core - Announcements | Ankündigungen",
};

export function applyAuthor(embed, nameKey) {
  const name = AUTHORS[nameKey] ?? "The Core";
  return embed.setAuthor({ name, iconURL: AUTHOR_ICON });
}
