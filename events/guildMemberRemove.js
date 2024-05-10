const { Events } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');

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
	name: Events.GuildMemberRemove,
	async execute(member) {
		const Member = require('../sequilize/members')(sequelize, DataTypes);
		const DopePoints = require('../sequilize/dope_points')(sequelize, DataTypes);

		Member.hasOne(DopePoints);
		DopePoints.belongsTo(Member);

		const memberDB = await Member.findOne({
			where: {
				discord_name: member.user.username,
			},
		});

		try {
			await memberDB.update({
				is_active: false,
			});

			const memberChannel = member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
			const thread = await memberChannel.threads.fetch(memberDB.dataValues.member_profile_post_id);

			await thread.setArchived(true);
		}
		catch (e) {
			console.log();
		}

	},
};