const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: 'dungeonQueueChannelMessage',
	async execute(client) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		// Post the DQ-Channel Message
		const dqChannel = await guild.channels.fetch(process.env.DUNGEN_QUEUE_CHANNEL_ID);

		const dqEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Dungeon-Partner-Queue')
			.setDescription('Here, you can easily find a partner for dungeon adventures that pose a challenge even when undertaken alone!\nUpon successful search, a private text channel will be automatically created.');

		const startDGQue = new ButtonBuilder()
			.setCustomId('start_dq')
			.setLabel('Start queue')
			.setStyle(ButtonStyle.Success);

		const dqDialogRow = new ActionRowBuilder()
			.addComponents(startDGQue);

		const messagesInDQChannel = await dqChannel.messages.fetch();
		if (!messagesInDQChannel.size > 0) {
			await dqChannel.send({ embeds: [dqEmbed], components: [dqDialogRow] });
		}
	},
};