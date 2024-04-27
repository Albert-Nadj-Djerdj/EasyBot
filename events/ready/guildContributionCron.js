const cron = require('cron');
const path = require('node:path');

module.exports = {
	name: 'guildContributionCron',
	async execute(client, Member, DopePoints) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		const memberList = await guild.members.fetch();

		const timing = '0 16 * * SUN';
		const guildContributionCron = new cron.CronJob(timing, async () => {

			try {
				const channelsThreads = await guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID).threads.fetch();

				channelsThreads.threads.forEach(async (element) => {
					const member = await Member.findOne({
						where: {
							discord_name: element.name.split('(')[1].split(')')[0],
						},
					});

					const dopePoints = await DopePoints.findOne({
						where: {
							memberId: member.dataValues.id,
						},
					});

					await dopePoints.update({
						dope_points: dopePoints.dataValues.dope_points - dopePoints.dataValues.contribution_sum,
					});

					await dopePoints.reload();

					const memberProfileEmbed = require(path.join(__dirname, '../embeds/memberProfileEmbed.js'));
					const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(member);

					const profileButtonsRow = require(path.join(__dirname, '../actionrows/profileButtonsRow.js'));
					const profileButtonsRowCreated = await profileButtonsRow.rowCreate(member, guild);

					const dopePointsEmbed = require(path.join(__dirname, '../embeds/dopePointsEmbed.js'));
					const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(member, DopePoints);

					const messages = await element.messages.fetch();

					await Array.from(messages.values()).pop().edit({ content: ' ', embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

					if (dopePoints.dataValues.dope_points < 0) {
						memberList.forEach(async (user, id) => {
							if (user.user.username !== member.dataValues.discord_name) {
								return;
							}

							user.send({ content: `Your Dope-Points are in the negatives (${dopePoints.dataValues.dope_points}). Please make sure to balance your account as soon as possible.` });

							const negativeDPChannel = guild.channels.cache.get(process.env.NEGATIVE_DP_CHANNEL_ID);
							await negativeDPChannel.send({ content: `<@${id}> has negative Dope-Points (${dopePoints.dataValues.dope_points})` });
						});
					}
				});
			}
			catch (e) {
				console.log(e);
			}
		});

		guildContributionCron.start();
	},
};