const cron = require('cron');

module.exports = {
	name: 'betaBossCronMessage',
	async execute(client) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		const timing = '55 1,3,5,7,9,11,13,15,17,19,21,23 * * *';
		// Post the Icewitch-Boss Message
		const betaBossMessageCron = new cron.CronJob(timing, async () => {

			const channel = guild.channels.cache.get(process.env.BOSS_CHANNEL_ID);

			const hours = new Date().getHours() + 2;
			const min = 59;
			const spawnDate = new Date(new Date().setHours(hours, min));

			const color = 0xf522e3;
			const file = './assets/png/wobba.png';

			const embed = {
				color: color,
				title: 'Beta Bosses',
				thumbnail: {
					url: 'attachment://wobba.png',
				},
				fields: [
					{ name: 'Time:', value: spawnDate.toLocaleString('de-DE', {
						hour: '2-digit',
						minute: '2-digit',
					}), inline: true },
					{ name: 'Date:', value: spawnDate.toLocaleString('de-DE', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					}), inline: true },
				],
			};

			channel.send({
				content: `Hey <@&${process.env.BETA_BOSSES_MENTION_ID}>, The Beta-Bosses will appear in a few minutes! Get on your way now!`,
				embeds: [embed],
				files: [file],
			}).then((message) => {
				setTimeout(async () => {
					try {
						await message.delete();

					}
					catch (e) {
						console.log(e);
					}
				}, 300_000);
			}).catch((e) => { console.log('29' + e); });
		});

		betaBossMessageCron.start();
	},
};