const { Op } = require('sequelize');
const path = require('node:path');

module.exports = {
	name: 'registerPresenceButton',
	async execute(interaction, Member) {
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

		if (thread.appliedTags.includes(abwesendTag?.id)) {
			const tags = thread.appliedTags.filter(function(item) {
				return item !== abwesendTag.id;
			});

			await thread.setAppliedTags(tags);
			await interaction.reply({
				content: 'Welcome back!',
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
			}).catch((e) => { console.log('12' + e); });

			const memberProfileEmbed = require(path.join(__dirname, '../../embeds/memberProfileEmbed.js'));
			const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

			const profileButtonsRow = require(path.join(__dirname, '../../actionrows/profileButtonsRow.js'));
			const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, interaction.member.guild);

			await interaction.message.edit({ embeds: [memberProfileEmbedCreated], components: [profileButtonsRowCreated] });

			const memberAnwesendEmbed = {
				color: 0x0bde16,
				title: interaction.message.embeds[0].fields[2].value,
			};
			await abwesenheitChannel.send({
				content: 'A member is back!',
				embeds: [memberAnwesendEmbed],
			});
		}
		else {
			await interaction.reply({
				content: 'You are strangely not marked as absent. Please report this message to the guild management',
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
			}).catch((e) => { console.log('13' + e); });
		}
	},
};