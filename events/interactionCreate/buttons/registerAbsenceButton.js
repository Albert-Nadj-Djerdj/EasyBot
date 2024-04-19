const { ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	name: 'registerAbsenceButton',
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
				}).catch((e) => { console.log('9' + e); });

				return;
			}

			try {
				const abwesenheitsAnmerkung = new TextInputBuilder()
					.setCustomId('abwesenheits_anmerkung')
					.setLabel('Remark:')
					.setStyle(TextInputStyle.Paragraph)
					.setPlaceholder('We take all the information you want to give us :) Duration, reason, other... ?');
				const abwesenheitsAnmerkungRow = new ActionRowBuilder().addComponents(abwesenheitsAnmerkung);
				const nebencharModal = new ModalBuilder()
					.setCustomId('abwesenheit_modal')
					.setTitle('Absence');

				nebencharModal.addComponents(abwesenheitsAnmerkungRow);
				await interaction.showModal(nebencharModal);
			}
			catch (e) {
				console.log('10' + e);
			}
		}
		catch (e) {
			console.log('11' + e);
		}
	},
};