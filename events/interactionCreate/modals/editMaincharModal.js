const { Op } = require('sequelize');
const path = require('node:path');

module.exports = {
	name: 'editMaincharModal',
	async execute(interaction, Member, Character, DopePoints) {
		await interaction.deferReply({ content: 'Updating Profile. This sometimes takes a minute..', ephemeral: true, fetchReply: true });
		try {
			const maincharName = interaction.fields.getTextInputValue('mainchar_name');
			const discordName = interaction.message.embeds[0].fields[0].value;

			const member = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: discordName,
					},
				},
			}, {
				includes: [Character],
			});

			await Character.update({
				character_name: maincharName,
			},
			{
				where: {
					[Op.and]: [{
						is_main: {
							[Op.eq]: true,
						},
					},
					{
						memberId: {
							[Op.eq]: member.dataValues.id,
						},
					}],
				},
			});

			const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
			const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);

			await thread.edit({
				name: maincharName + ' - (' + discordName + ')',
			});

			const memberProfileEmbed = require(path.join(__dirname, '../../embeds/memberProfileEmbed.js'));
			const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

			const profileButtonsRow = require(path.join(__dirname, '../../actionrows/profileButtonsRow.js'));
			const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, interaction.member.guild);

			const dopePointsEmbed = require(path.join(__dirname, '../../embeds/dopePointsEmbed.js'));
			const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(member, DopePoints);

			await interaction.message.edit({ embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

			await interaction.editReply({
				content: 'Profile edited',
			}).then(() => {
				setTimeout(async () => {
					try {
						await interaction.deleteReply();
					}
					catch (e) {
						console.log(e);
					}
				}, 20_000);
			}).catch((e) => { console.log('25' + e); });
		}
		catch (e) {
			console.log('23' + e);
		}
	},
};