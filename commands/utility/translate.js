const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = {
	data: new ContextMenuCommandBuilder()
		.setName('Translate to local')
		.setType(ApplicationCommandType.Message),
	async execute(interaction) {
		console.log(interaction);
		const translationEmbed = {
			color: 0xfcba03,
			author: { name: interaction.user.globalName, iconUrl: interaction.member.displayAvatarURL() ?? interaction.member.user.displayAvatarURL() },
			description: 'Translate Feature in progress',
		};
		await interaction.reply({ embeds: [translationEmbed], ephemeral: true });
	},
};