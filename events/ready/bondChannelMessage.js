const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: 'bondChannelMessage',
	async execute(client) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		// Post the Bond-Channel Message
		const schuldscheinChannel = await guild.channels.fetch(process.env.SCHULDSCHEIN_CHANNEL_ID);

		const schuldscheinEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Credit management')
			.setDescription('You can view and manage your credits here.');

		const list = new ButtonBuilder()
			.setCustomId('list')
			.setLabel('List my credits')
			.setStyle(ButtonStyle.Primary);

		const create = new ButtonBuilder()
			.setCustomId('create')
			.setLabel('Create new credit')
			.setStyle(ButtonStyle.Success);

		const embedDialogRow = new ActionRowBuilder()
			.addComponents(list, create);

		const messagesInSchuldscheinChannel = await schuldscheinChannel.messages.fetch();
		if (!messagesInSchuldscheinChannel.size > 0) {
			await schuldscheinChannel.send({ embeds: [schuldscheinEmbed], components: [embedDialogRow] });
		}
	},
};