const { Events } = require('discord.js');
// const { bold, ComponentType, quote } = require('discord.js');
// const wait = require('node:timers/promises').setTimeout;
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client, Member, DopePoints) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		// Load all Events from the ready folder
		const eventsPath = path.join(__dirname, 'ready');
		const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

		for (const file of eventFiles) {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			event.execute(client, Member, DopePoints);
		}
	},
};