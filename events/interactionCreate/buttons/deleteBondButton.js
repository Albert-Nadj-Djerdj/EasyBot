const wait = require('node:timers/promises').setTimeout;

module.exports = {
	name: 'listMyBondsButton',
	async execute(interaction, Bond) {
		await interaction.deferReply({ ephemeral: true });

		try {
			const schuldscheinId = interaction.message.embeds[0].data.title.split(' ')[1];
			await Bond.update({
				active: false,
			},
			{
				where: {
					id: schuldscheinId,
				},
			});

			const deleteReply = await interaction.editReply({ content: `Credit ${schuldscheinId} closed!`, ephemeral: true });
			await interaction.deleteReply(interaction.message);
			await wait(10_000);
			try {
				await interaction.deleteReply(deleteReply);
			}
			catch (e) {
				return;
			}
		}
		catch {
			const deleteReply2 = await interaction.followUp({ content: 'Something went wrong.. fuck it!', ephemeral: true });
			await wait(10_000);
			try {
				await interaction.deleteReply(deleteReply2);
			}
			catch (e) {
				return;
			}
		}
	},
};