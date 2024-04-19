const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const wait = require('node:timers/promises').setTimeout;
const { Op } = require('sequelize');

module.exports = {
	name: 'listMyBondsButton',
	async execute(interaction, Bond) {
		await interaction.deferReply({ ephemeral: true });

		const bonds = await Bond.findAll({
			where: {
				[Op.or]: [
					{
						creditor: {
							[Op.like]: interaction.user.globalName,
						},
					},
					{
						debtor: {
							[Op.like]: interaction.user.globalName,
						},
					},
				],
				active: true,
			},
		});

		if (bonds.length === 0) {
			const listEmptyReply = await interaction.followUp({ content: 'You dont have any Credits yet!', ephemeral: true });
			await wait(10_000);
			await interaction.deleteReply(listEmptyReply);
		}
		else {
			const embeds = [];

			bonds.forEach(async (bond) => {
				const embed = {
					color: 0xf522e3,
					title: `Credit ${bond.dataValues.id}`,
					fields: [
						{ name: 'Creditor:', value: `${bond.dataValues.creditor}`, inline: true },
						{ name: 'Debtor:', value: `${bond.dataValues.debtor}`, inline: true },
						{ name: 'Credit:', value: `${bond.dataValues.bond}`, inline: true },
						{ name: 'Created at:', value: `${bond.dataValues.createdAt}`, inline: true },
					],
				};

				if (bond.dataValues.creditor === interaction.user.globalName) {
					const deleteButton = new ButtonBuilder()
						.setCustomId('delete')
						.setLabel('Close credit')
						.setStyle(ButtonStyle.Danger);

					const deleteDialogRow = new ActionRowBuilder()
						.addComponents(deleteButton);

					const bondEmbed = await interaction.followUp({ embeds: [embed], components: [deleteDialogRow], ephemeral: true });

					await wait(300_000);
					try {
						await interaction.deleteReply(bondEmbed);
					}
					catch (e) {
						return;
					}
				}
				else {
					const bondEmbed = await interaction.followUp({ embeds: [embed], ephemeral: true });
					embeds.push(bondEmbed);
				}
			});
		}
	},
};