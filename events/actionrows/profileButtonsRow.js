const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
	name: 'profileButtonsRow',
	async rowCreate(member, guild) {
		const maincharEdit = new ButtonBuilder()
			.setCustomId('mainchar_edit')
			.setLabel('Edit mainchar')
			.setStyle(ButtonStyle.Primary);

		const nebencharCreate = new ButtonBuilder()
			.setCustomId('nebenchar_create')
			.setLabel('Add secondary char')
			.setStyle(ButtonStyle.Success);

		const nebencharDelete = new ButtonBuilder()
			.setCustomId('nebenchar_delete')
			.setLabel('Delete secondary char')
			.setStyle(ButtonStyle.Danger);

		const abwesenheitAnmelden = new ButtonBuilder()
			.setCustomId('abwesenheit_anmelden')
			.setLabel('Register absence')
			.setStyle(ButtonStyle.Secondary);

		const anwesenheitAnmelden = new ButtonBuilder()
			.setCustomId('anwesenheit_melden')
			.setLabel('I`m back!')
			.setStyle(ButtonStyle.Secondary);

		const memberChannel = guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
		const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
		const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'away')[0];

		return new ActionRowBuilder()
			.addComponents(maincharEdit, nebencharCreate, nebencharDelete, thread.appliedTags.includes(abwesendTag?.id) ? anwesenheitAnmelden : abwesenheitAnmelden);
	},
};