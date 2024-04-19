const { ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	name: 'createSecondaryCharButton',
	async execute(interaction) {
		try {
			const discord_name = interaction.message.embeds[0].data.fields[0].value;

			if (interaction.user.username !== discord_name) {
				interaction.reply({ content: 'Not your profile you bad boy!', ephemeral: true }).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);
				}).catch((e) => { console.log('3' + e); });

				return;
			}

			const nebencharName = new TextInputBuilder().setCustomId('nebenchar_name').setLabel('Secondary char name:').setStyle(TextInputStyle.Short);
			const nebencharNameRow = new ActionRowBuilder().addComponents(nebencharName);

			const nebencharInGuild = new TextInputBuilder().setCustomId('nebenchar_in_guild').setLabel('In guild?').setStyle(TextInputStyle.Short).setValue('yes');
			const nebencharInGuildRow = new ActionRowBuilder().addComponents(nebencharInGuild);

			const nebencharModal = new ModalBuilder()
				.setCustomId('nebenchar_modal')
				.setTitle('Add secondary char');

			nebencharModal.addComponents(nebencharNameRow, nebencharInGuildRow);

			await interaction.showModal(nebencharModal);
		}
		catch (e) {
			console.log('4' + e);
		}
	},
};