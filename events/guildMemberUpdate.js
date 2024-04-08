const { Events, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
	process.env.DATABASE_NAME,
	process.env.DATABASE_USER,
	process.env.DATABASE_PW,
	{
		host: process.env.DATABASE_HOST,
		dialect: 'mysql',
	},
);

module.exports = {
	name: Events.GuildMemberUpdate,
	async execute(oldMember, newMember) {
		const oldRoles = await oldMember.roles.cache;
		const newRoles = await newMember.roles.cache;
		const Member = require('.././sequilize/members')(sequelize, DataTypes);
		const Character = require('.././sequilize/characters')(sequelize, DataTypes);

		const oldHasGuildRole = oldRoles.has(process.env.GUILD_ROLE_ID);
		const oldHasGuildTestRole = oldRoles.has(process.env.GUILD_TEST_ROLE_ID);
		const newHasGuildRole = newRoles.has(process.env.GUILD_ROLE_ID);
		const newHasGuildTestRole = newRoles.has(process.env.GUILD_TEST_ROLE_ID);

		// Mitglied aus Gilde entfernt
		if ((oldHasGuildRole || oldHasGuildTestRole) && (!newHasGuildRole && !newHasGuildTestRole)) {
			try {
				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: newMember.user.username,
						},
					},
				});

				// Member inaktiv setzen.
				if (member !== null) {
					await member.update({
						is_active: false,
					});

					const memberChannel = oldMember.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

					const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
					await thread.setArchived(true);
				}
			}
			catch (e) {
				console.log('30' + e);
			}
		}
		else if ((!oldHasGuildRole && !oldHasGuildTestRole) && (newHasGuildRole || newHasGuildTestRole)) {
			try {
				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: newMember.user.username,
						},
					},
				});

				const memberChannel = oldMember.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

				// Wenn Member nur inaktiv setz aktiv, sonst erstell Eintrag in Memberliste
				if (member !== null) {
					await member.update({
						is_active: true,
					});

					const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
					await thread.setArchived(false);
				}
				else {
					Member.hasMany(Character);
					Character.belongsTo(Member);

					const memberProfileEmbed = {
						color: 0xf522e3,
						title: 'Member-Profil',
						fields: [
							{ name: 'Discord:', value: newMember.user.username, inline: false },
							{ name: '\u200B', value: '\u200B', inline: false },
							{ name: 'Mainchar:', value: '-', inline: false },
							{ name: '\u200B', value: '\u200B', inline: false },
						],
					};

					const maincharEdit = new ButtonBuilder()
						.setCustomId('mainchar_edit')
						.setLabel('Mainchar bearbeiten')
						.setStyle(ButtonStyle.Primary);

					const nebencharCreate = new ButtonBuilder()
						.setCustomId('nebenchar_create')
						.setLabel('Nebenchar hinzufügen')
						.setStyle(ButtonStyle.Success);

					const nebencharDelete = new ButtonBuilder()
						.setCustomId('nebenchar_delete')
						.setLabel('Nebenchar löschen')
						.setStyle(ButtonStyle.Danger);

					const abwesenheitAnmelden = new ButtonBuilder()
						.setCustomId('abwesenheit_anmelden')
						.setLabel('Abwesenheit anmelden')
						.setStyle(ButtonStyle.Secondary);

					const profileButtonRow = new ActionRowBuilder()
						.addComponents(maincharEdit, nebencharCreate, nebencharDelete, abwesenheitAnmelden);


					const memberProfilePost = await memberChannel.threads.create({ name: newMember.user.globalName + ' - (' + newMember.user.username + ')', message: { embeds: [memberProfileEmbed], components: [profileButtonRow] } });
					await memberProfilePost.members.add(newMember.user.id);

					await Member.create({
						discord_name: newMember.user.username,
						discord_global_name: newMember.user.globalName,
						member_since: (new Date()).toLocaleString('de-DE', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						}),
						is_active: true,
						characters: {
							character_name: null,
							is_main: true,
							is_guild: true,
						},
						member_profile_post_id: memberProfilePost.id,
					}, {
						include: [Character],
					});
				}
			}
			catch (e) {
				console.log('31' + e);
			}
		}
	},
};