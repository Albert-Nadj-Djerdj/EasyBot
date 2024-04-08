const { Events, UserSelectMenuBuilder, ActionRowBuilder, ChannelType, TextInputBuilder, PermissionsBitField, ModalBuilder, ButtonBuilder, ButtonStyle, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
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

const Member = require('../sequilize/members')(sequelize, DataTypes);
const Character = require('../sequilize/characters')(sequelize, DataTypes);
const Bond = require('.././sequilize/bond')(sequelize, DataTypes);
const DungeonQueue = require('../sequilize/dg_queues')(sequelize, DataTypes);


Member.hasMany(Character);
Character.belongsTo(Member);

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
				console.log(error);
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
			// Reacting to "Create new Bond" button
			if (interaction.customId === 'create') {
				await interaction.deferReply({ ephemeral: true });

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
					const listEmptyReply = await interaction.followUp({ content: 'Du hast noch keine Schuldscheine!', ephemeral: true });
					await wait(10_000);
					await interaction.deleteReply(listEmptyReply);
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

			// React to "Mainchar bearbeiten" button
			if (interaction.customId === 'mainchar_edit') {
				try {

					const discord_name = interaction.message.embeds[0].data.fields[0].value;

					if (interaction.user.username !== discord_name) {
						interaction.reply({ content: 'Nicht dein Profil du böser bub!', ephemeral: true }).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('1' + e); });

						return;
					}

					const member = await Member.findOne({
						where: {
							discord_name: {
								[Op.eq]: interaction.user.username,
							},
						},
					});

					const mainchar = await Character.findOne({
						where: {
							is_main: {
								[Op.eq]: true,
							},
							memberId: {
								[Op.eq]: member.id,
							},
						},
					});

					const maincharName = new TextInputBuilder().setCustomId('mainchar_name').setLabel('Mainchar-Name:').setStyle(TextInputStyle.Short);
					if (mainchar.dataValues.character_name !== null) {
						maincharName.setValue(mainchar.dataValues.character_name);
					}
					const maincharRow = new ActionRowBuilder().addComponents(maincharName);

					const maincharModal = new ModalBuilder()
						.setCustomId('mainchar_modal')
						.setTitle('Mainchar bearbeiten');

					maincharModal.addComponents(maincharRow);

					await interaction.showModal(maincharModal);
				}
				catch (e) {
					console.log('2' + e);
				}
			}

			// React to "Nebenchar erstellen" button
			if (interaction.customId === 'nebenchar_create') {
				try {
					const discord_name = interaction.message.embeds[0].data.fields[0].value;

					if (interaction.user.username !== discord_name) {
						interaction.reply({ content: 'Nicht dein Profil du böser bub!', ephemeral: true }).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('3' + e); });

						return;
					}

					const nebencharName = new TextInputBuilder().setCustomId('nebenchar_name').setLabel('Nebenchar-Name:').setStyle(TextInputStyle.Short);
					const nebencharNameRow = new ActionRowBuilder().addComponents(nebencharName);

					const nebencharInGuild = new TextInputBuilder().setCustomId('nebenchar_in_guild').setLabel('In der Gilde?').setStyle(TextInputStyle.Short).setValue('ja');
					const nebencharInGuildRow = new ActionRowBuilder().addComponents(nebencharInGuild);

					const nebencharModal = new ModalBuilder()
						.setCustomId('nebenchar_modal')
						.setTitle('Nebenchar hinzufügen');

					nebencharModal.addComponents(nebencharNameRow, nebencharInGuildRow);

					await interaction.showModal(nebencharModal);
				}
				catch (e) {
					console.log('4' + e);
				}
			}

			// React to "Nebenchar löschen" button
			if (interaction.customId === 'nebenchar_delete') {

				try {
					const discord_name = interaction.message.embeds[0].data.fields[0].value;

					if (interaction.user.username !== discord_name) {
						interaction.reply({ content: 'Nicht dein Profil du böser bub!', ephemeral: true }).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('5' + e); });

						return;
					}

					const member = await Member.findOne({
						where: {
							discord_name: {
								[Op.eq]: discord_name,
							},
						},
					}, {
						includes: [Character],
					});

					const memberCharacters = await member.getCharacters();
					const nebenchars = [];

					memberCharacters.forEach((char) => {
						if (!char.dataValues.is_main) {
							nebenchars.push((new StringSelectMenuOptionBuilder()
								.setLabel(char.dataValues.character_name)
								.setDescription('In Gilde: ' + char.dataValues.is_guild)
								.setValue(`${char.dataValues.id}`)
							));
						}
					});

					const select = new StringSelectMenuBuilder()
						.setCustomId('nebenchar_delete_select')
						.setPlaceholder('Nebenchar auswählen:')
						.addOptions(...nebenchars)
						.setMaxValues(1);

					if (nebenchars.length > 0) {
						const selectMessageResponse = await interaction.reply({
							components: [(new ActionRowBuilder()).addComponents(select)],
							ephemeral: true,
							fetchReply: true,
						});
						const selectedChar = await selectMessageResponse.awaitMessageComponent();

						await Character.destroy({
							where: {
								id: {
									[Op.eq]: selectedChar.values[0],
								},
							},
						});

						const memberAfterDelete = await Member.findOne({
							where: {
								discord_name: {
									[Op.eq]: discord_name,
								},
							},
						}, {
							includes: [Character],
						});

						const memberCharactersAfterDelete = await memberAfterDelete.getCharacters();

						const fields = [
							{ name: 'Discord:', value: discord_name, inline: false },
							{ name: '\u200B', value: '\u200B', inline: false },
							{ name: 'Mainchar:', value: interaction.message.embeds[0].fields[2].value, inline: false },
						];

						let firstDone = false;
						memberCharactersAfterDelete.forEach((char) => {
							if (!char.dataValues.is_main && !firstDone) {
								fields.push({ name: '\u200B', value: '\u200B', inline: false });
								fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
								fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
								fields.push({ name: '\u200B', value: '\u200B', inline: true });

								firstDone = true;
							}
							else if (!char.dataValues.is_main) {
								fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
								fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
								fields.push({ name: '\u200B', value: '\u200B', inline: true });
							}
						});

						const memberProfileEmbedUpdate = {
							color: 0xf522e3,
							title: 'Member-Profil',
							fields,
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

						const anwesenheitAnmelden = new ButtonBuilder()
							.setCustomId('anwesenheit_melden')
							.setLabel('Wieder zurück!')
							.setStyle(ButtonStyle.Secondary);

						const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

						const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
						const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'Abwesend')[0];

						const profileButtonRow = new ActionRowBuilder()
							.addComponents(maincharEdit, nebencharCreate, nebencharDelete, thread.appliedTags.includes(abwesendTag.id) ? anwesenheitAnmelden : abwesenheitAnmelden);

						await interaction.message.edit({ embeds: [memberProfileEmbedUpdate], components: [profileButtonRow] });

						await interaction.deleteReply();
						selectedChar.reply({
							content: 'Profil angepasst',
							ephemeral: true,
						}).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('6' + e); });
					}
					else {
						interaction.reply({
							content: 'Keine Nebenchars',
							ephemeral: true,
						}).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('7' + e); });
					}

				}
				catch (e) {
					console.log('8' + e);
				}
			}

			// React to "Abwesenheit anmelden" button
			if (interaction.customId === 'abwesenheit_anmelden') {

				try {
					const discord_name = interaction.message.embeds[0].data.fields[0].value;

					if (interaction.user.username !== discord_name) {
						interaction.reply({ content: 'Nicht dein Profil du böser bub!', ephemeral: true }).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('9' + e); });

						return;
					}

					try {
						const abwesenheitsAnmerkung = new TextInputBuilder()
							.setCustomId('abwesenheits_anmerkung')
							.setLabel('Anmerkung:')
							.setStyle(TextInputStyle.Paragraph)
							.setPlaceholder('Wir nehmen alle Informationen die du uns geben willst :) Dauer, Grund, Sonstiges... ?');
						const abwesenheitsAnmerkungRow = new ActionRowBuilder().addComponents(abwesenheitsAnmerkung);
						const nebencharModal = new ModalBuilder()
							.setCustomId('abwesenheit_modal')
							.setTitle('Abwesenheit');

						nebencharModal.addComponents(abwesenheitsAnmerkungRow);
						await interaction.showModal(nebencharModal);
					}
					catch (e) {
						console.log('10' + e);
					}
				}
				catch (e) {
					console.log('11' + e);
				}
			}

			// React to "Wieder zurück!" button
			if (interaction.customId === 'anwesenheit_melden') {
				const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
				const abwesenheitChannel = interaction.member.guild.channels.cache.get(process.env.ABWESENHEIT_CHANNEL_ID);

				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: interaction.member.user.username,
						},
					},
				});

				const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
				const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'Abwesend')[0];

				if (thread.appliedTags.includes(abwesendTag.id)) {
					const tags = thread.appliedTags;
					tags.pop(abwesendTag.id);

					await thread.setAppliedTags(tags);
					interaction.reply({
						content: 'Willkommen zurück!',
						ephemeral: true,
					}).then((message) => {
						setTimeout(async () => {
							try {
								await message.delete();
							}
							catch (e) {
								console.log(e);
							}
						}, 20_000);
					}).catch((e) => { console.log('12' + e); });

					const memberCharactersAfterDelete = await member.getCharacters();

					const fields = [
						{ name: 'Discord:', value: member.discord_name, inline: false },
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Mainchar:', value: interaction.message.embeds[0].fields[2].value, inline: false },
					];

					let firstDone = false;
					memberCharactersAfterDelete.forEach((char) => {
						if (!char.dataValues.is_main && !firstDone) {
							fields.push({ name: '\u200B', value: '\u200B', inline: false });
							fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
							fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
							fields.push({ name: '\u200B', value: '\u200B', inline: true });

							firstDone = true;
						}
						else if (!char.dataValues.is_main) {
							fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
							fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
							fields.push({ name: '\u200B', value: '\u200B', inline: true });
						}
					});

					const memberProfileEmbedUpdate = {
						color: 0xf522e3,
						title: 'Member-Profil',
						fields,
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

					await interaction.message.edit({ embeds: [memberProfileEmbedUpdate], components: [profileButtonRow] });

					const memberAnwesendEmbed = {
						color: 0x0bde16,
						title: interaction.message.embeds[0].fields[2].value,
					};
					abwesenheitChannel.send({
						content: 'Ein Member ist wieder da!',
						embeds: [memberAnwesendEmbed],
					});
				}
				else {
					await interaction.reply({
						content: 'Du bist komischerweise nicht als Abwesend markiert. Bitte melde diese Nachricht hier an die Gildenleitung',
						ephemeral: true,
					}).then((message) => {
						setTimeout(async () => {
							try {
								await message.delete();
							}
							catch (e) {
								console.log(e);
							}
						}, 20_000);
					}).catch((e) => { console.log('13' + e); });
				}
			}

			// React to "Queue starten" Button
			if (interaction.customId === 'start_dq') {

				try {
					const userQueue = await DungeonQueue.findOne({
						where: {
							[Op.and]: [
								{ discord_name: interaction.user.username },
								{ status: 1 },
							],
						},
					});

					if (userQueue) {
						interaction.reply({ content: 'Du bist bereits in einer suche', ephemeral: true }).then((message) => {
							setTimeout(async () => {
								try {
									await message.delete();
								}
								catch (e) {
									console.log(e);
								}
							}, 20_000);
						}).catch((e) => { console.log('14' + e); });

						return;
					}

					try {
						const selectDg = new StringSelectMenuBuilder()
							.setCustomId('dungeon_select')
							.setPlaceholder('Dungeon auswählen:')
							.addOptions(
								new StringSelectMenuOptionBuilder()
									.setLabel('Mystisches Reich')
									.setValue('Mystisches Reich'),
								new StringSelectMenuOptionBuilder()
									.setLabel('Bruthöhle der Spinnenbaroness')
									.setValue('Bruthöhle der Spinnenbaroness'),
								new StringSelectMenuOptionBuilder()
									.setLabel('Devils Catacomb')
									.setValue('Devils Catacomb'),
								new StringSelectMenuOptionBuilder()
									.setLabel('Drachenraum')
									.setValue('Drachenraum'),
								new StringSelectMenuOptionBuilder()
									.setLabel('Rotdrachenfestung')
									.setValue('Rotdrachenfestung'),
								new StringSelectMenuOptionBuilder()
									.setLabel('Nemeres Warte')
									.setValue('Nemeres Warte'),
							)
							.setMaxValues(1);

						const selectDgMessageResponse = await interaction.reply({
							components: [(new ActionRowBuilder()).addComponents(selectDg)],
							ephemeral: true,
							fetchReply: true,
						});
						const selectedDg = await selectDgMessageResponse.awaitMessageComponent();
						await interaction.deleteReply();

						const openQueue = await DungeonQueue.findOne({
							where: {
								[Op.and]: [
									{ dungeon: selectedDg.values[0] },
									{ status: 1 },
								],
							},
						});

						if (openQueue) {
							await interaction.guild.channels.create({
								name: openQueue.dataValues.discord_name + ' + ' + interaction.user.username + ' (' + openQueue.dataValues.dungeon + ')',
								type: ChannelType.GuildVoice,
								parent: process.env.DUNGEN_QUEUE_CAT_ID,
								permissionOverwrites: [
									{
										id: interaction.guild.id,
										deny: PermissionsBitField.Flags.ViewChannel,
									},
									{
										id: interaction.user.id,
										allow: PermissionsBitField.Flags.ViewChannel,
									},
									{
										id: openQueue.dataValues.discord_id,
										allow: PermissionsBitField.Flags.ViewChannel,
									},
								],
							})
								.then((channel) => {
									setTimeout(async () => {
										try {
											await channel.delete();
										}
										catch (e) {
											console.log(e);
										}
									}, 3_600_000);
								})
								.catch((e) => { console.log(e); });
							await interaction.guild.channels.create({
								name: openQueue.dataValues.discord_name + '_' + interaction.user.username + '__' + openQueue.dataValues.dungeon,
								type: ChannelType.GuildText,
								parent: process.env.DUNGEN_QUEUE_CAT_ID,
								permissionOverwrites: [
									{
										id: interaction.guild.id,
										deny: PermissionsBitField.Flags.ViewChannel,
									},
									{
										id: interaction.user.id,
										allow: PermissionsBitField.Flags.ViewChannel,
									},
									{
										id: openQueue.dataValues.discord_id,
										allow: PermissionsBitField.Flags.ViewChannel,
									},
								],
							})
								.then(async (channel) => {
									selectedDg.reply({ content: `Wir haben den richtigen Partner für dich! Voice und Text-Channel werden erstellt.\n<#${channel.id}>`, ephemeral: true }).then((message) => {
										setTimeout(async () => {
											try {
												await message.delete();
											}
											catch (e) {
												console.log(e);
											}
										}, 600_000);
									}).catch((e) => { console.log('15' + e); });

									channel.send({
										content: `<@${openQueue.dataValues.discord_id}> <@${interaction.user.id}>\n\nViel Erfolg!\nDie Channel werden in 1h von alleine gelöscht.`,
									});
									const openQueueUser = await channel.guild.members.fetch(openQueue.dataValues.discord_id);
									try {
										openQueueUser.send({ content: `Wir haben den richtigen Partner für dich! Voice und Text-Channel werden erstellt.\n<#${channel.id}>` });
									}
									catch (e) {
										console.log('16' + e);
									}

									setTimeout(async () => {
										try {
											await channel.delete();
										}
										catch (e) {
											console.log(e);
										}
									}, 3_600_000);
								})
								.catch((e) => { console.log(e); });

							await openQueue.update({
								status: 0,
								success: 1,
							});

							const dqQueueChannel = await interaction.guild.channels.fetch(process.env.DUNGEN_QUEUE_CHANNEL_ID);
							const dqThread = await dqQueueChannel.threads.fetch(openQueue.dataValues.thread_id);
							await dqThread.delete();
						}
						else {
							const dqStopButton = new ButtonBuilder()
								.setCustomId('stop_dq')
								.setLabel('Queue stopppen')
								.setStyle(ButtonStyle.Danger);

							const dqStopDialoqRow = new ActionRowBuilder()
								.addComponents(dqStopButton);

							const dgQueueChannel = await interaction.guild.channels.fetch(process.env.DUNGEN_QUEUE_CHANNEL_ID);
							await dgQueueChannel.threads.create({
								name: `Queue - ${selectedDg.values[0]} - ${interaction.user.username}`,
								autoArchiveDuration: 60,
								type: ChannelType.PrivateThread,
							})
								.then(async (channel) => {
									const dqCreated = await DungeonQueue.create({
										discord_name: interaction.user.username,
										discord_id: interaction.user.id,
										thread_id: channel.id,
										dungeon: selectedDg.values[0],
										status: 1,
										success: null,
									});

									await channel.members.add(interaction.user.id);
									channel.send({
										content: 'Die Suche beginnt!\n\nDu wirst Benachrichtigt sobald wir jemanden gefunden haben.\n\nDie Suche wird nach 1h von alleine beendet.',
										components: [dqStopDialoqRow],
									}).then(() => {
										setTimeout(async () => {
											try {
												await dqCreated.reload();
												if (dqCreated.dataValues.status) {
													dqCreated.update({
														status: 0,
														success: 0,
													});
												}
											}
											catch (e) {
												console.log(e);
											}
										}, 3_590_000);
									});

									await selectedDg.reply({
										content: 'Die Suche beginnt!' + `\n<#${channel.id}>`,
										ephemeral: true,
									}).then(async (message) => {
										setTimeout(async () => {
											try {
												await message.delete();
											}
											catch (e) {
												console.log(e);
											}
										}, 600_000);
									}).catch((e) => { console.log('17' + e); });

									setTimeout(async () => {
										try {
											await channel.delete();
										}
										catch (e) {
											console.log(e);
										}
									}, 20_000);
								})
								.catch((e) => { console.log(e); });

							const queuesStartedChannel = interaction.guild.channels.cache.get(process.env.DUNGEN_QUEUE_CALLOUT_CHANNEL_ID);

							queuesStartedChannel.send({ content: `<@${interaction.user.id}> hat einen Dungeon-Partner-Queue gestartet für folgenden Dungeon: ${selectedDg.values[0]}` }).catch((e) => { console.log('18' + e); });
						}
					}
					catch (e) {
						console.log('19' + e);
					}
				}
				catch (e) {
					console.log('20' + e);
				}
			}

			// React to "Queue stoppen" Button
			if (interaction.customId === 'stop_dq') {

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
						interaction.reply({ content: 'Es läuft keine suche!\nDu kannst den Thread entweder verlassen oder warten bis es von alleine geschlossen wird.', ephemeral: true }).then((message) => {
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
						interaction.reply({ content: 'Suche wurde beendet. Thread wird in 20s gelöscht', ephemeral: true }).then((message) => {
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

				schuldnerObjekt.send({ content: 'Der Benutzer "' + interaction.user.globalName + '" hat ein Schuldschein erstellt. Inhalt der Schuldbeschreibung: ' + interaction.fields.getTextInputValue('schuldverschreibung'), components: [startDialogRow] }).then(async (response) => {
					const selectedAction = await response.awaitMessageComponent();

					await selectedAction.deferReply();

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
				}).catch((e) => {
					console.log('24' + e);
				});
			}

			// React to "Mainchar edit modal"
			if (interaction.customId === 'mainchar_modal') {
				const maincharName = interaction.fields.getTextInputValue('mainchar_name');
				const discordName = interaction.message.embeds[0].fields[0].value;

				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: discordName,
						},
					},
				}, {
					includes: [Character],
				});

				Character.update({
					character_name: maincharName,
				},
				{
					where: {
						[Op.and]: [{
							is_main: {
								[Op.eq]: true,
							},
						},
						{
							memberId: {
								[Op.eq]: member.dataValues.id,
							},
						}],
					},
				});

				const memberCharacters = await member.getCharacters();

				const fields = [
					{ name: 'Discord:', value: discordName, inline: false },
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Mainchar:', value: maincharName, inline: false },
				];

				let firstDone = false;
				memberCharacters.forEach((char) => {
					if (!char.dataValues.is_main && !firstDone) {
						fields.push({ name: '\u200B', value: '\u200B', inline: false });
						fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
						fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
						fields.push({ name: '\u200B', value: '\u200B', inline: true });

						firstDone = true;
					}
					else if (!char.dataValues.is_main) {
						fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
						fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
						fields.push({ name: '\u200B', value: '\u200B', inline: true });
					}
				});

				const memberProfileEmbedUpdate = {
					color: 0xf522e3,
					title: 'Member-Profil',
					fields,
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

				const anwesenheitAnmelden = new ButtonBuilder()
					.setCustomId('anwesenheit_melden')
					.setLabel('Wieder zurück!')
					.setStyle(ButtonStyle.Secondary);

				const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

				const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
				const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'Abwesend')[0];

				const profileButtonRow = new ActionRowBuilder()
					.addComponents(maincharEdit, nebencharCreate, nebencharDelete, thread.appliedTags.includes(abwesendTag.id) ? anwesenheitAnmelden : abwesenheitAnmelden);

				await thread.edit({
					name: maincharName + ' - (' + discordName + ')',
				});

				await interaction.message.edit({ embeds: [memberProfileEmbedUpdate], components: [profileButtonRow] });

				await interaction.reply({
					content: 'Profil angepasst',
					ephemeral: true,
				}).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);
				}).catch((e) => { console.log('25' + e); });
			}

			// React to "Nebenchar create modal"
			if (interaction.customId === 'nebenchar_modal') {
				const nebencharName = interaction.fields.getTextInputValue('nebenchar_name');
				let nebencharInGuild = false;

				if (interaction.fields.getTextInputValue('nebenchar_in_guild') === 'ja') {
					nebencharInGuild = true;
				}

				const maincharName = interaction.message.embeds[0].fields[2].value;
				const discordName = interaction.message.embeds[0].fields[0].value;

				const memberId = (await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: discordName,
						},
					},
				})).dataValues.id;

				await Character.create({
					character_name: nebencharName,
					is_main: false,
					is_guild: nebencharInGuild,
					memberId: memberId,
				});

				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: discordName,
						},
					},
				}, {
					includes: [Character],
				});

				const memberCharacters = await member.getCharacters();

				const fields = [
					{ name: 'Discord:', value: discordName, inline: false },
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Mainchar:', value: maincharName, inline: false },
				];

				let firstDone = false;
				memberCharacters.forEach((char) => {
					if (!char.dataValues.is_main && !firstDone) {
						fields.push({ name: '\u200B', value: '\u200B', inline: false });
						fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
						fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
						fields.push({ name: '\u200B', value: '\u200B', inline: true });

						firstDone = true;
					}
					else if (!char.dataValues.is_main) {
						fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
						fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
						fields.push({ name: '\u200B', value: '\u200B', inline: true });
					}
				});

				const memberProfileEmbedUpdate = {
					color: 0xf522e3,
					title: 'Member-Profil',
					fields,
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

				const anwesenheitAnmelden = new ButtonBuilder()
					.setCustomId('anwesenheit_melden')
					.setLabel('Wieder zurück!')
					.setStyle(ButtonStyle.Secondary);

				const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);

				const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
				const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'Abwesend')[0];

				const profileButtonRow = new ActionRowBuilder()
					.addComponents(maincharEdit, nebencharCreate, nebencharDelete, thread.appliedTags.includes(abwesendTag.id) ? anwesenheitAnmelden : abwesenheitAnmelden);

				await interaction.message.edit({ embeds: [memberProfileEmbedUpdate], components: [profileButtonRow] });

				await interaction.reply({
					content: 'Profil angepasst',
					ephemeral: true,
				}).then((message) => {
					setTimeout(async () => {
						try {
							await message.delete();
						}
						catch (e) {
							console.log(e);
						}
					}, 20_000);
				}).catch((e) => { console.log('26' + e); });
			}

			// React to "Abwesenheit modal"
			if (interaction.customId === 'abwesenheit_modal') {

				const memberChannel = interaction.member.guild.channels.cache.get(process.env.MEMBER_CHANNEL_ID);
				const abwesenheitChannel = interaction.member.guild.channels.cache.get(process.env.ABWESENHEIT_CHANNEL_ID);

				const member = await Member.findOne({
					where: {
						discord_name: {
							[Op.eq]: interaction.member.user.username,
						},
					},
				});

				const thread = await memberChannel.threads.fetch(member.dataValues.member_profile_post_id);
				const abwesendTag = memberChannel.availableTags.filter((tag) => tag.name === 'Abwesend')[0];

				if (!thread.appliedTags.includes(abwesendTag.id)) {

					await thread.setAppliedTags([...thread.appliedTags, abwesendTag.id]);
					interaction.reply({
						content: 'Danke und bis Bald!',
						ephemeral: true,
					}).then((message) => {
						setTimeout(async () => {
							try {
								await message.delete();
							}
							catch (e) {
								console.log(e);
							}
						}, 20_000);
					}).catch((e) => { console.log('27' + e); });

					const memberCharactersAfterDelete = await member.getCharacters();

					const fields = [
						{ name: 'Discord:', value: member.discord_name, inline: false },
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Mainchar:', value: interaction.message.embeds[0].fields[2].value, inline: false },
					];

					let firstDone = false;
					memberCharactersAfterDelete.forEach((char) => {
						if (!char.dataValues.is_main && !firstDone) {
							fields.push({ name: '\u200B', value: '\u200B', inline: false });
							fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
							fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
							fields.push({ name: '\u200B', value: '\u200B', inline: true });

							firstDone = true;
						}
						else if (!char.dataValues.is_main) {
							fields.push({ name: 'Nebenchar:', value: char.dataValues.character_name, inline: true });
							fields.push({ name: 'in Gilde:', value: char.dataValues.is_guild, inline: true });
							fields.push({ name: '\u200B', value: '\u200B', inline: true });
						}
					});

					const memberProfileEmbedUpdate = {
						color: 0xf522e3,
						title: 'Member-Profil',
						fields,
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

					const anwesenheitAnmelden = new ButtonBuilder()
						.setCustomId('anwesenheit_melden')
						.setLabel('Wieder zurück!')
						.setStyle(ButtonStyle.Secondary);

					const profileButtonRow = new ActionRowBuilder()
						.addComponents(maincharEdit, nebencharCreate, nebencharDelete, anwesenheitAnmelden);

					await interaction.message.edit({ embeds: [memberProfileEmbedUpdate], components: [profileButtonRow] });

					const memberAbwesendEmbed = {
						color: 0xed1405,
						title: interaction.message.embeds[0].fields[2].value,
						fields: [{ name: 'Anmerkung', value: interaction.fields.getTextInputValue('abwesenheits_anmerkung') }],
					};
					abwesenheitChannel.send({
						content: 'Ein Member hat sich als Abwesend eingetragen:',
						embeds: [memberAbwesendEmbed],
					});
				}
				else {
					await interaction.reply({
						content: 'Du bist bereits als Abwesend gemeldet!',
						ephemeral: true,
					}).then((message) => {
						setTimeout(async () => {
							try {
								await message.delete();
							}
							catch (e) {
								console.log(e);
							}
						}, 20_000);
					}).catch((e) => { console.log('28' + e); });
				}
			}
		}
	},
};