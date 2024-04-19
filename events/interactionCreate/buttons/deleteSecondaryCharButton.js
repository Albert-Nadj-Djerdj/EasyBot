const { ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder } = require('discord.js');
const { Op } = require('sequelize');
const path = require('node:path');

module.exports = {
	name: 'deleteSecondaryCharButton',
	async execute(interaction, Member, Character) {
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
				}).catch((e) => { console.log('5' + e); });

				return;
			}

			const member = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: discord_name,
					},
				},
			}, {
				includes: [Character],
			});

			const memberCharacters = await member.getCharacters();
			const nebenchars = [];

			memberCharacters.forEach((char) => {
				if (!char.dataValues.is_main) {
					nebenchars.push((new StringSelectMenuOptionBuilder()
						.setLabel(char.dataValues.character_name)
						.setDescription('In guild: ' + char.dataValues.is_guild)
						.setValue(`${char.dataValues.id}`)
					));
				}
			});

			const select = new StringSelectMenuBuilder()
				.setCustomId('nebenchar_delete_select')
				.setPlaceholder('Select secondary char:')
				.addOptions(...nebenchars)
				.setMaxValues(1);

			if (nebenchars.length > 0) {
				const selectMessageResponse = await interaction.reply({
					components: [(new ActionRowBuilder()).addComponents(select)],
					ephemeral: true,
					fetchReply: true,
				});
				const selectedChar = await selectMessageResponse.awaitMessageComponent();

				await Character.destroy({
					where: {
						id: {
							[Op.eq]: selectedChar.values[0],
						},
					},
				});

				const memberProfileEmbed = require(path.join(__dirname, '../../embeds/memberProfileEmbed.js'));
				const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

				const profileButtonsRow = require(path.join(__dirname, '../../actionrows/profileButtonsRow.js'));
				const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, interaction.member.guild);

				await interaction.message.edit({ embeds: [memberProfileEmbedCreated], components: [profileButtonsRowCreated] });

				await interaction.deleteReply();
				selectedChar.reply({
					content: 'Profile edited!',
					ephemeral: true,
				}).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);
				}).catch((e) => { console.log('6' + e); });
			}
			else {
				interaction.reply({
					content: 'No secondary chars',
					ephemeral: true,
				}).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);
				}).catch((e) => { console.log('7' + e); });
			}

		}
		catch (e) {
			console.log('8' + e);
		}
	},
};