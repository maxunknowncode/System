// ESM nutzen; kein dotenv. ENV kommen direkt aus process.env (TOKEN, CLIENT_ID, GUILD_ID).
// TODO: { Client, GatewayIntentBits } aus 'discord.js' importieren.
// TODO: Client mit minimalen Intents (z. B. GatewayIntentBits.Guilds) erzeugen.
// TODO: commandLoader & eventLoader importieren und ausführen, um Commands/Events zu registrieren.
// TODO: client.login(process.env.TOKEN) aufrufen.
