const cron = require('cron');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	name: 'guildContributionCron',
	async execute(client) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		const timing = '0 10 * * SUN';
		const memberProfileAntiAutoArchiveMessageCron = new cron.CronJob(timing, async () => {

			try {
				const channelsThreads = await guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID).threads.fetch();

				channelsThreads.threads.forEach(async (element) => {
					element.send({
						content: 'Anti auto archive, message will be deleted in 10 Minutes',
					}).then(async (message) => {
						await wait(600_000);
						message.delete();
					}).catch((e) => {
						console.log(e);
					});
				});
			}
			catch (e) {
				console.log(e);
			}
		});

		memberProfileAntiAutoArchiveMessageCron.start();
	},
};