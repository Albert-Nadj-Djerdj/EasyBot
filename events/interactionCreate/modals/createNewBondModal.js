const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	name: 'createNewBondModal',
	async execute(interaction, Bond) {
		try {
			await interaction.reply({
				content: 'Wait for confirmation from the debtor...',
				files: [{
					attachment: './assets/gifs/loader.gif',
					name: 'loading_spinner.gif',
				}],
				ephemeral: true,
			});

			const guild = interaction.member.guild;
			const res = await guild.members.fetch();
			const schuldnerObjekt = res.find((member) => member.user.globalName === interaction.fields.getTextInputValue('schuldner'));

			const accept = new ButtonBuilder()
				.setCustomId('accept')
				.setLabel('Accept credit')
				.setStyle(ButtonStyle.Success);

			const decline = new ButtonBuilder()
				.setCustomId('decline')
				.setLabel('Decline credit')
				.setStyle(ButtonStyle.Danger);

			const startDialogRow = new ActionRowBuilder()
				.addComponents(accept, decline);

			schuldnerObjekt.send({ content: 'The user "' + interaction.user.globalName + '" has created a Credit. Credit description: ' + interaction.fields.getTextInputValue('schuldverschreibung'), components: [startDialogRow] }).then(async (response) => {
				const selectedAction = await response.awaitMessageComponent();

				await selectedAction.deferReply();

				if (selectedAction.customId === 'accept') {
					await interaction.editReply({
						content: 'The debtor has confirmed the credit',
						files: [{
							attachment: './assets/gifs/check.gif',
							name: 'accepted.jpg',
						}],
						ephemeral: true,
					});

					await selectedAction.editReply({ content: 'Thank you for the confirmation!' });

					Bond.create({
						creditor: interaction.user.globalName,
						debtor: interaction.fields.getTextInputValue('schuldner'),
						bond: interaction.fields.getTextInputValue('schuldverschreibung'),
						active: true,
					});

					await wait(60_000);
					await interaction.deleteReply();
				}
				else {
					await interaction.editReply({
						content: 'The debtor has rejected the credit',
						files: [{
							attachment: './assets/gifs/cross.gif',
							name: 'declined.jpg',
						}],
						ephemeral: true,
					});

					await selectedAction.editReply({ content:'You motherfucker!' });
					await wait(60_000);
					await interaction.deleteReply();
				}
			}).catch((e) => {
				console.log('24' + e);
			});
		}
		catch (e) {
			console.log('23' + e);
		}
	},
};