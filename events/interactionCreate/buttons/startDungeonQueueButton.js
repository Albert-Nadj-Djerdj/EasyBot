const { ActionRowBuilder, StringSelectMenuOptionBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const { Op } = require('sequelize');

module.exports = {
	name: 'startDungeonQueueButton',
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

			if (userQueue) {
				interaction.reply({ content: 'You are allready in a queue', ephemeral: true }).then((message) => {
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
					.setPlaceholder('Select dungeon:')
					.addOptions(
						new StringSelectMenuOptionBuilder()
							.setLabel('Mystic Realm')
							.setValue('Mystic Realm'),
						new StringSelectMenuOptionBuilder()
							.setLabel('Spider Queens Nest')
							.setValue('Spider Queens Nest'),
						new StringSelectMenuOptionBuilder()
							.setLabel('Devils Catacomb')
							.setValue('Devils Catacomb'),
						new StringSelectMenuOptionBuilder()
							.setLabel('Dragons Temple')
							.setValue('Dragons Temple'),
						new StringSelectMenuOptionBuilder()
							.setLabel('Red Dragon Fortress')
							.setValue('Rotdrachenfestung'),
						new StringSelectMenuOptionBuilder()
							.setLabel('Nemeres Watchtower')
							.setValue('Nemeres Watchtower'),
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
							selectedDg.reply({ content: `We have the right partner for you! Voice and text channels are created.\n<#${channel.id}>`, ephemeral: true }).then((message) => {
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
								content: `<@${openQueue.dataValues.discord_id}> <@${interaction.user.id}>\n\nGood luck!\nThe channels will be deleted by themselves in 1h.`,
							});
							const openQueueUser = await channel.guild.members.fetch(openQueue.dataValues.discord_id);
							try {
								openQueueUser.send({ content: `We have the right partner for you! Voice and text channels are created.\n<#${channel.id}>` });
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
						.setLabel('Stop queue')
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
								content: 'The search begins!\n\nYou will be notified as soon as we have found someone.\n\nThe search will end automatically after 1h.',
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
								content: 'The search begins!' + `\n<#${channel.id}>`,
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
							}, 3_600_000);
						})
						.catch((e) => { console.log(e); });

					const queuesStartedChannel = interaction.guild.channels.cache.get(process.env.DUNGEN_QUEUE_CALLOUT_CHANNEL_ID);

					queuesStartedChannel.send({ content: `<@${interaction.user.id}> has started a dungeon partner queue for the following dungeon: ${selectedDg.values[0]}` }).catch((e) => { console.log('18' + e); });
				}
			}
			catch (e) {
				console.log('19' + e);
			}
		}
		catch (e) {
			console.log('20' + e);
		}
	},
};