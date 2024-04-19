const { Op } = require('sequelize');
const path = require('node:path');

module.exports = {
	name: 'registerAbsenceModal',
	async execute(interaction, Member) {
		try {
			const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
			const abwesenheitChannel = interaction.member.guild.channels.cache.get(process.env.ABWESENHEIT_CHANNEL_ID);

			const member = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: interaction.user.username,
					},
				},
			});

			const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
			const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'away')[0];

			if (!thread.appliedTags.includes(abwesendTag?.id)) {

				await thread.setAppliedTags([...thread.appliedTags, abwesendTag.id]);

				const memberProfileEmbed = require(path.join(__dirname, '../../embeds/memberProfileEmbed.js'));
				const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

				const profileButtonsRow = require(path.join(__dirname, '../../actionrows/profileButtonsRow.js'));
				const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, interaction.member.guild);

				await interaction.message.edit({ embeds: [memberProfileEmbedCreated], components: [profileButtonsRowCreated] });

				await interaction.reply({
					content: 'Thanks and see you soon!',
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
				}).catch((e) => { console.log('27' + e); });

				const memberAbwesendEmbed = {
					color: 0xed1405,
					title: interaction.message.embeds[0].fields[2].value,
					fields: [{ name: 'Remark:', value: interaction.fields.getTextInputValue('abwesenheits_anmerkung') }],
				};

				await abwesenheitChannel.send({
					content: 'One member has registered as absent:',
					embeds: [memberAbwesendEmbed],
				});
			}
			else {
				await interaction.reply({
					content: 'You are already registered as absent!',
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
				}).catch((e) => { console.log('28' + e); });
			}
		}
		catch (e) {
			console.log('23' + e);
		}
	},
};