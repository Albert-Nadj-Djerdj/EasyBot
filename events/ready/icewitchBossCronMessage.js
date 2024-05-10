const { ButtonBuilder, ButtonStyle, ActionRowBuilder, ComponentType, bold, quote } = require('discord.js');
const cron = require('cron');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	name: 'icewitchBossCronMessage',
	async execute(client) {
		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		// '40 3,9,15,21 * * *'
		// const collectorTime = 900_000;
		// const deleteFMM = 1_200_000;
		// Post the Front-Mage-Event Message
		const icewitchMessageCron = new cron.CronJob('40 3,9,15,21 * * *', async () => {

			const channel = guild.channels.cache.get(process.env.BOSS_CHANNEL_ID);

			const collectorTime = 900_000;
			const deleteFMM = 1_200_000;
			const hours = new Date().getHours() + 2;
			const min = 59;
			const spawnDate = new Date(new Date().setHours(hours, min));

			let memberAmount = '0';
			let totalDamage = '0';
			let status = 'Not enough damage';
			const neededDamage = '80';
			let color = 0xf522e3;
			const file = './assets/png/eishexe.png';

			const embed = {
				color: color,
				title: 'Icewitch',
				thumbnail: {
					url: 'attachment://eishexe.png',
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
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Member registrated:', value: memberAmount, inline: true },
					{ name: 'Total damage (in K):', value: totalDamage.toString(), inline: true },
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Needed damage:', value: neededDamage.toString(), inline: true },
					{ name: 'Status:', value: status, inline: true },
				],
			};


			const button25k = new ButtonBuilder()
				.setCustomId('2.5')
				.setLabel('2.5k')
				.setStyle(ButtonStyle.Primary);
			const button50k = new ButtonBuilder()
				.setCustomId('5.0')
				.setLabel('5.0k')
				.setStyle(ButtonStyle.Primary);
			const button75k = new ButtonBuilder()
				.setCustomId('7.5')
				.setLabel('7.5k')
				.setStyle(ButtonStyle.Primary);
			const button100k = new ButtonBuilder()
				.setCustomId('10.0')
				.setLabel('10k')
				.setStyle(ButtonStyle.Primary);
			const button125k = new ButtonBuilder()
				.setCustomId('12.5')
				.setLabel('12.5k')
				.setStyle(ButtonStyle.Primary);
			const button150k = new ButtonBuilder()
				.setCustomId('15.0')
				.setLabel('15k')
				.setStyle(ButtonStyle.Primary);
			const button175k = new ButtonBuilder()
				.setCustomId('17.5')
				.setLabel('17.5k')
				.setStyle(ButtonStyle.Primary);
			const button200k = new ButtonBuilder()
				.setCustomId('20.0')
				.setLabel('20k')
				.setStyle(ButtonStyle.Primary);
			const button250k = new ButtonBuilder()
				.setCustomId('25.0')
				.setLabel('25k')
				.setStyle(ButtonStyle.Primary);
			const button300k = new ButtonBuilder()
				.setCustomId('30.0')
				.setLabel('30k')
				.setStyle(ButtonStyle.Primary);
			const button350k = new ButtonBuilder()
				.setCustomId('35.0')
				.setLabel('35k')
				.setStyle(ButtonStyle.Primary);
			const buttonPVP = new ButtonBuilder()
				.setCustomId('0.0')
				.setLabel('PVP')
				.setStyle(ButtonStyle.Danger);

			const dmgRow = new ActionRowBuilder().addComponents(button25k, button50k, button75k, button100k);
			const dmg2Row = new ActionRowBuilder().addComponents(button125k, button150k, button175k, button200k);
			const dmg3Row = new ActionRowBuilder().addComponents(button250k, button300k, button350k, buttonPVP);

			const frontMageMessage = await channel.send({
				content: `Hey <@&${process.env.EISHEXE_MENTION_ID}>, \n\nThe battle against the Ice Witch begins at ${spawnDate.getHours()}:${spawnDate.getMinutes()}. If you would like to participate, please respond with your approximate damage.\nThe status regarding the damage achieved will be announced 5 minutes before the spawn. If there is sufficient participation, we will meet at the spawnpoint 2 minutes before.\n\n ${bold('Loot:')} \n${quote('All relics will be collected on the guild storage char. Participants will be rewarded with Dope Points and can purchase relics from the leadership.')}\n\nRegistration ends 5 minutes before spawn!`,
				embeds: [embed],
				files: [file],
				components: [dmgRow, dmg2Row, dmg3Row],
			});

			const collector = frontMageMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: collectorTime });

			const userAbmeldungen = [];
			const userAbmeldungenNamen = [];

			collector.on('collect', async m => {

				memberAmount = (parseInt(memberAmount) + 1);
				totalDamage = (parseFloat(totalDamage) + parseFloat(m.customId));

				if (parseFloat(totalDamage) >= parseFloat(neededDamage)) {
					status = 'Min. damage reached';
					color = 0x37eb34;
				}
				else {
					status = 'Not enough damage';
					color = 0xf522e3;
				}

				const embedUpdate = {
					color: color,
					title: 'Icewitch',
					thumbnail: {
						url: 'attachment://eishexe.png',
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
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Member registrated:', value: memberAmount, inline: true },
						{ name: 'Total damage (in K):', value: totalDamage.toString(), inline: true },
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Needed damage:', value: neededDamage.toString(), inline: true },
						{ name: 'Status:', value: status, inline: true },
					],
				};

				m.message.edit({ embeds: [embedUpdate], files: [file] });

				const abmeldenButton = new ButtonBuilder()
					.setCustomId('abmelden')
					.setLabel('Withdraw the registration')
					.setStyle(ButtonStyle.Danger);

				const abmeldeRow = new ActionRowBuilder().addComponents(abmeldenButton);

				m.reply({ components: [abmeldeRow], content: 'Registered with: ' + m.customId + 'K damage', ephemeral: true, fetchReply: true }).then(repliedMessage => {
					const collector2 = repliedMessage.createMessageComponentCollector({ componentType: ComponentType.Button });

					// Absage interaction
					collector2.on('collect', async m2 => {
						memberAmount = (parseInt(memberAmount) - 1);
						totalDamage = (parseFloat(totalDamage) - parseFloat(m.customId));

						userAbmeldungen.push(m2.user.id);
						userAbmeldungenNamen.push(m2.user.username);

						if (parseFloat(totalDamage) >= parseFloat(neededDamage)) {
							status = 'Min. damage reached';
							color = 0x37eb34;
						}
						else {
							status = 'Not enough damage';
							color = 0xf522e3;
						}

						const embedUpdateAbmeldung = {
							color: color,
							title: 'Icewitch',
							thumbnail: {
								url: 'attachment://eishexe.png',
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
								{ name: '\u200B', value: '\u200B', inline: false },
								{ name: 'Member registrated:', value: memberAmount, inline: true },
								{ name: 'Total damage (in K):', value: totalDamage.toString(), inline: true },
								{ name: '\u200B', value: '\u200B', inline: false },
								{ name: 'Needed damage:', value: neededDamage.toString(), inline: true },
								{ name: 'Status:', value: status, inline: true },
							],
						};

						m.message.edit({ embeds: [embedUpdateAbmeldung], files: [file] });
						m.deleteReply();
						m2.reply({ content: 'Registration succesfully withdrawed', ephemeral: true });
						await wait(15_000);
						m2.deleteReply();
					});
				}).catch((e) => console.log(e));
			});

			collector.on('end', async m => {
				let thread = '';

				const usersToPing = [];
				const usersToMention = [];

				m.forEach(async (buttonInteraction) => {
					usersToPing.push(buttonInteraction.user.id);
					usersToMention.push(buttonInteraction.user.username);

					try {
						await buttonInteraction.deleteReply();
					}
					catch (e) {
						console.log(e);
					}
				});

				userAbmeldungen.forEach((userId) => {
					const index = usersToPing.indexOf(userId);
					if (index > -1) {
						usersToPing.splice(index, 1);
					}
				});

				userAbmeldungenNamen.forEach((userName) => {
					const index2 = usersToMention.indexOf(userName);
					if (index2 > -1) {
						usersToPing.splice(index2, 1);
					}
				});

				const usersToPingUnique = [... new Set(usersToPing) ];
				const usersToMentionUnique = [... new Set(usersToMention) ];

				thread = await channel.threads.create({
					name: `Icewitch ${spawnDate.toLocaleString('de-DE', {
						hour: '2-digit',
						minute: '2-digit',
					})} o´Clock - ${spawnDate.toLocaleString('de-DE', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					})}`,
					reason: 'Dropps etc',
				});

				if (status === 'Min. damage reached') {
					await thread.send({
						content: usersToMentionUnique.toString(),
					});
				}

				usersToPingUnique.forEach(async (user) => {
					let contentString = '';
					if (status === 'Min. damage reached') {
						contentString = `<@${user}> --- The icewitch spawns in 5 minutes. Please do not start any more dungeons! Participants are listed in the thread below.\n<#${thread.id}>`;
					}
					else {
						contentString = `<@${user}> --- The icewitch has been canceled.`;
					}

					const res = await guild.members.fetch();
					const schuldnerObjekt = res.find((member) => member.user.id === user);
					schuldnerObjekt.send({ content:  contentString }).catch((e) => { console.log(e); });
				});
			});

			await wait(deleteFMM);
			frontMageMessage.delete();
		});

		icewitchMessageCron.start();
	},
};