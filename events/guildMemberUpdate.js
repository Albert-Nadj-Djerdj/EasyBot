const { Events } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
const path = require('node:path');

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
					const memberProfilePost = await memberChannel.threads.create({ name: newMember.user.globalName + ' - (' + newMember.user.username + ')', message: { content: 'Profile in making.' } });

					const memberCreated = await Member.create({
						discord_name: newMember.user.username,
						discord_global_name: newMember.user.globalName,
						member_since: (new Date()).toLocaleString('de-DE', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						}),
						is_active: true,
						characters: {
							character_name: '-',
							is_main: true,
							is_guild: true,
						},
						member_profile_post_id: memberProfilePost.id,
					}, {
						include: [Character],
					});

					const memberProfileEmbed = require(path.join(__dirname, 'embeds/memberProfileEmbed.js'));
					const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(memberCreated);

					const profileButtonsRow = require(path.join(__dirname, 'actionrows/profileButtonsRow.js'));
					const profileButtonsRowCreated = await profileButtonsRow.rowCreate(memberCreated, newMember.guild);

					const messages = await memberProfilePost.messages.fetch();
					console.log(messages.values().next().value);

					const memberProfilePostUpdated = await messages.values().next().value.edit({ content: ' ', embeds: [memberProfileEmbedCreated], components: [profileButtonsRowCreated] });
					console.log(memberProfilePostUpdated);

					await memberProfilePost.members.add(newMember.user.id);
				}
			}
			catch (e) {
				console.log('31' + e);
			}
		}
	},
};