const { Events, UserSelectMenuBuilder, ActionRowBuilder, TextInputBuilder, ModalBuilder, ButtonBuilder, ButtonStyle, TextInputStyle } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
const wait = require('node:timers/promises').setTimeout;

const sequelize = new Sequelize(
	process.env.DATABASE_NAME,
	process.env.DATABASE_USER,
	process.env.DATABASE_PW,
	{
		host: process.env.DATABASE_HOST,
		dialect: 'mysql',
	},
);
const Bond = require('.././sequilize/bond')(sequelize, DataTypes);

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {

		// Commands
		if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				await command.execute(interaction);
			}
			catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
				}
				else {
					await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
				}
			}
		}


		// Buttons
		if (interaction.isButton()) {
			if ((interaction.customId === '25')
				|| (interaction.customId === '50')
				|| (interaction.customId === '75')
				|| (interaction.customId === '100')
				|| (interaction.customId === '125')
				|| (interaction.customId === '150')
				|| (interaction.customId === '175')
				|| (interaction.customId === '200')
				|| (interaction.customId === 'abmelden')) {
				return;
			}

			await interaction.deferReply({ ephemeral: true });

			// Reacting to "Create new Bond" button
			if (interaction.customId === 'create') {
				const selectMenu = new UserSelectMenuBuilder({
					custom_id: 'schuldner_selection',
					placeholder: 'Wähle den Schuldner',
					max_values: 1,
				});

				const userSelectRow = new ActionRowBuilder().addComponents(selectMenu);

				const createActionResponse = await interaction.editReply({ content: 'Wähle den Schuldner:', components: [userSelectRow], ephemeral: true });
				const selectedUser = await createActionResponse.awaitMessageComponent();

				const schuldner = new TextInputBuilder().setCustomId('schuldner').setLabel('Schuldner:').setStyle(TextInputStyle.Short).setValue(selectedUser.users.first().globalName);
				const schuldnerRow = new ActionRowBuilder().addComponents(schuldner);

				const schuldverschreibung = new TextInputBuilder().setCustomId('schuldverschreibung').setLabel('Schuldverschreibung:').setStyle(TextInputStyle.Paragraph);
				const schuldverschreibungRow = new ActionRowBuilder().addComponents(schuldverschreibung);

				const modal = new ModalBuilder()
					.setCustomId('schuldschein_modal')
					.setTitle('Schuldschein erstellen');

				modal.addComponents(schuldnerRow, schuldverschreibungRow);

				await selectedUser.showModal(modal);

				selectedUser.deleteReply();
			}

			// React to "List my Bonds" button
			if (interaction.customId === 'list') {
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
					const listEmptyReply = await interaction.followUp({ content: 'Du hast noch keine Schuldscheine!', ephemeral: true });
					await wait(10_000);
					interaction.deleteReply(listEmptyReply);
				}
				else {
					const embeds = [];

					bonds.forEach(async (bond) => {
						const embed = {
							color: 0xf522e3,
							title: `Schuldschein ${bond.dataValues.id}`,
							fields: [
								{ name: 'Kreditor:', value: `${bond.dataValues.creditor}`, inline: true },
								{ name: 'Debitor:', value: `${bond.dataValues.debtor}`, inline: true },
								{ name: 'Schuldverschreibung:', value: `${bond.dataValues.bond}`, inline: true },
								{ name: 'Erstellt am:', value: `${bond.dataValues.createdAt}`, inline: true },
							],
						};

						if (bond.dataValues.creditor === interaction.user.globalName) {
							const deleteButton = new ButtonBuilder()
								.setCustomId('delete')
								.setLabel('Schuldschein schließen')
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
			}

			// React to "Delete this Bond" button
			if (interaction.customId === 'delete') {

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

					const deleteReply = await interaction.editReply({ content: `Schuldschein ${schuldscheinId} abgeschlossen!`, ephemeral: true });
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
					const deleteReply2 = await interaction.followUp({ content: 'Irgendetwas klappt nicht.. fuck it!', ephemeral: true });
					await wait(10_000);
					try {
						await interaction.deleteReply(deleteReply2);
					}
					catch (e) {
						return;
					}
				}
			}
		}

		// Modal submits
		if (interaction.isModalSubmit()) {

			// React to "Create bond modal"
			if (interaction.customId === 'schuldschein_modal') {
				await interaction.reply({
					content: 'Warte auf die Bestätigung des Schuldners...',
					files: [{
						attachment: './assets/gifs/loader.gif',
						name: 'loading_spinner.gif',
					}],
					ephemeral: true,
				});

				const guild = interaction.member.guild;
				const res = await guild.members.fetch();
				const schuldnerObjekt = res.find((member) => member.user.globalName === interaction.fields.getTextInputValue('schuldner'));

				const accept = new ButtonBuilder()
					.setCustomId('accept')
					.setLabel('Schuldschein bestätigen')
					.setStyle(ButtonStyle.Success);

				const decline = new ButtonBuilder()
					.setCustomId('decline')
					.setLabel('Schuldschein ablehnen')
					.setStyle(ButtonStyle.Danger);

				const startDialogRow = new ActionRowBuilder()
					.addComponents(accept, decline);

				const schuldnerResponse = await schuldnerObjekt.send({ content: 'Der Benutzer "' + interaction.user.globalName + '" hat ein Schuldschein erstellt. Inhalt der Schuldbeschreibung: ' + interaction.fields.getTextInputValue('schuldverschreibung'), components: [startDialogRow] });

				const selectedAction = await schuldnerResponse.awaitMessageComponent();

				if (selectedAction.customId === 'accept') {
					await interaction.editReply({
						content: 'Der Schuldner hat den Schuldschein bestätigt',
						files: [{
							attachment: './assets/gifs/check.gif',
							name: 'accepted.jpg',
						}],
						ephemeral: true,
					});

					await selectedAction.editReply({ content: 'Vielen Dank für die Bestätigung!' });

					Bond.create({
						creditor: interaction.user.globalName,
						debtor: interaction.fields.getTextInputValue('schuldner'),
						bond: interaction.fields.getTextInputValue('schuldverschreibung'),
						active: true,
					});

					await wait(60_000);
					await interaction.deleteReply();
				}
				else {
					await interaction.editReply({
						content: 'Der Schuldner hat den Schuldschein abgelehnt',
						files: [{
							attachment: './assets/gifs/cross.gif',
							name: 'declined.jpg',
						}],
						ephemeral: true,
					});

					await selectedAction.editReply({ content:'You Motherfucker!' });
					await wait(60_000);
					await interaction.deleteReply();
				}
			}
		}
	},
};