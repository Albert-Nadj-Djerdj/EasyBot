const { Op } = require('sequelize');
const path = require('node:path');

module.exports = {
	name: 'createSecondaryCharModal',
	async execute(interaction, Member, Character, DopePoints) {
		try {
			const nebencharName = interaction.fields.getTextInputValue('nebenchar_name');
			let nebencharInGuild = false;

			if (interaction.fields.getTextInputValue('nebenchar_in_guild') === 'yes') {
				nebencharInGuild = true;
			}

			const member = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: interaction.user.username,
					},
				},
			});

			await Character.create({
				character_name: nebencharName,
				is_main: false,
				is_guild: nebencharInGuild,
				memberId: member.dataValues.id,
			});

			const memberProfileEmbed = require(path.join(__dirname, '../../embeds/memberProfileEmbed.js'));
			const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

			const profileButtonsRow = require(path.join(__dirname, '../../actionrows/profileButtonsRow.js'));
			const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, interaction.member.guild);

			const dopePointsEmbed = require(path.join(__dirname, '../../embeds/dopePointsEmbed.js'));
			const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(member, DopePoints);

			await interaction.message.edit({ embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

			await interaction.reply({
				content: 'Profile edited',
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
			}).catch((e) => { console.log('26' + e); });
		}
		catch (e) {
			console.log('23' + e);
		}
	},
};