const { ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');
const { Op } = require('sequelize');

module.exports = {
	name: 'editMaincharButton',
	async execute(interaction, Character, Member) {
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
				}).catch((e) => { console.log('1' + e); });

				return;
			}

			const member = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: interaction.user.username,
					},
				},
			});

			const mainchar = await Character.findOne({
				where: {
					is_main: {
						[Op.eq]: true,
					},
					memberId: {
						[Op.eq]: member.id,
					},
				},
			});

			const maincharName = new TextInputBuilder().setCustomId('mainchar_name').setLabel('Mainchar-Name:').setStyle(TextInputStyle.Short);
			if (mainchar.dataValues.character_name !== null) {
				maincharName.setValue(mainchar.dataValues.character_name);
			}
			const maincharRow = new ActionRowBuilder().addComponents(maincharName);

			const maincharModal = new ModalBuilder()
				.setCustomId('mainchar_modal')
				.setTitle('Edit mainchar');

			maincharModal.addComponents(maincharRow);

			await interaction.showModal(maincharModal);
		}
		catch (e) {
			console.log('2' + e);
		}
	},
};