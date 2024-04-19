const { Op } = require('sequelize');

module.exports = {
	name: 'stopDungeonQueueButton',
	async execute(interaction, DungeonQueue) {
		try {
			const userQueue = await DungeonQueue.findOne({
				where: {
					[Op.and]: [
						{ discord_name: interaction.user.username },
						{ status: 1 },
					],
				},
			});

			if (!userQueue) {
				interaction.reply({ content: 'There is no queue running!\nYou can either leave the thread or wait until it is closed by itself.', ephemeral: true }).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 300_000);
				}).catch((e) => { console.log('21' + e); });
			}
			else {
				await userQueue.update({
					status: 0,
					success: 0,
				});
				interaction.reply({ content: 'Search has been completed. Thread will be deleted in 20s.', ephemeral: true }).then((message) => {
					setTimeout(async () => {
						try {
							const dqQueueChannel = await interaction.guild.channels.fetch(process.env.DUNGEN_QUEUE_CHANNEL_ID);
							const dqThread = await dqQueueChannel.threads.fetch(message.interaction.channelId);
							await dqThread.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);

				}).catch((e) => { console.log('22' + e); });
			}
		}
		catch (e) {
			console.log('23' + e);
		}
	},
};