const { EmbedBuilder, Events, ButtonBuilder, ActionRowBuilder, ButtonStyle, bold, ComponentType, quote } = require('discord.js');
const cron = require('cron');
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const guild = client.guilds.cache.get(process.env.GUILD_ID);
		// Post the Bond-Channel Message
		const schuldscheinChannel = await guild.channels.fetch(process.env.SCHULDSCHEIN_CHANNEL_ID);

		const schuldscheinEmbed = new EmbedBuilder()
			.setColor(0x0099FF)
			.setTitle('Schuldschein-Verwaltung')
			.setDescription('Hier kannst du Schuldscheine erstellen und einsehen');

		const list = new ButtonBuilder()
			.setCustomId('list')
			.setLabel('Meine Schuldscheine aufzeigen')
			.setStyle(ButtonStyle.Primary);

		const create = new ButtonBuilder()
			.setCustomId('create')
			.setLabel('Neuen Schuldschein erstellen')
			.setStyle(ButtonStyle.Success);

		const embedDialogRow = new ActionRowBuilder()
			.addComponents(list, create);

		const messagesInChannel = await schuldscheinChannel.messages.fetch();
		if (!messagesInChannel.size > 0) {
			await schuldscheinChannel.send({ embeds: [schuldscheinEmbed], components: [embedDialogRow] });
		}

		// Post the Boss-Event Messages
		const frontMageMessageCron = new cron.CronJob('03 10,20,22 * * *', async () => {

			const channel = guild.channels.cache.get(process.env.BOSS_CHANNEL_ID);

			const collectorTime = 1_800_000;
			const deleteFMM = 2_100_000;
			const hours = new Date().getHours() + 1;
			const min = 0;
			const spawnDate = new Date(new Date().setHours(hours, min));

			let memberAmount = '0';
			let totalDamage = '0';
			let status = 'Nicht genug Gesamtschaden';
			const neededDamage = '650';
			let color = 0xf522e3;
			const file = './assets/png/fronti.png';

			const embed = {
				color: color,
				title: 'Frontmagier',
				thumbnail: {
					url: 'attachment://fronti.png',
				},
				fields: [
					{ name: 'Uhrzeit:', value: spawnDate.toLocaleString('de-DE', {
						hour: '2-digit',
						minute: '2-digit',
					}), inline: true },
					{ name: 'Datum:', value: spawnDate.toLocaleString('de-DE', {
						day: '2-digit',
						month: '2-digit',
						year: 'numeric',
					}), inline: true },
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Angemeldete Member:', value: memberAmount, inline: true },
					{ name: 'Gesamtschaden (in K):', value: totalDamage, inline: true },
					{ name: '\u200B', value: '\u200B', inline: false },
					{ name: 'Benötigter Schaden:', value: neededDamage, inline: true },
					{ name: 'Status:', value: status, inline: true },
				],
			};


			const button25k = new ButtonBuilder()
				.setCustomId('25')
				.setLabel('25k')
				.setStyle(ButtonStyle.Primary);
			const button50k = new ButtonBuilder()
				.setCustomId('50')
				.setLabel('50k')
				.setStyle(ButtonStyle.Primary);
			const button75k = new ButtonBuilder()
				.setCustomId('75')
				.setLabel('75k')
				.setStyle(ButtonStyle.Primary);
			const button100k = new ButtonBuilder()
				.setCustomId('100')
				.setLabel('100k')
				.setStyle(ButtonStyle.Primary);
			const button125k = new ButtonBuilder()
				.setCustomId('125')
				.setLabel('125k')
				.setStyle(ButtonStyle.Primary);
			const button150k = new ButtonBuilder()
				.setCustomId('150')
				.setLabel('150k')
				.setStyle(ButtonStyle.Primary);
			const button175k = new ButtonBuilder()
				.setCustomId('175')
				.setLabel('175k')
				.setStyle(ButtonStyle.Primary);
			const button200k = new ButtonBuilder()
				.setCustomId('200')
				.setLabel('200k')
				.setStyle(ButtonStyle.Primary);

			const dmgRow = new ActionRowBuilder().addComponents(button25k, button50k, button75k, button100k);
			const dmg2Row = new ActionRowBuilder().addComponents(button125k, button150k, button175k, button200k);

			const frontMageMessage = await channel.send({
				content: `Hey <@&${process.env.BOSS_ROLE_MENTION_ID}>, \n\n der Kampf gegen den Front-Magier beginnt um ${spawnDate.getHours()} Uhr. Wenn ihr teilnehmen möchtet, reagiert bitte mit eurem ungefähren Schaden. \n Der Status bezüglich des erzielten Schadens wird 15 Minuten vor dem Spawn bekannt gegeben. Bei ausreichender Teilnahme treffen wir uns 2 Minuten vorher am Spawnpoint. \n\n ${bold('Beute:')} \n ${quote('Alle Cors werden im Gildenlager auf der zweiten Seite platziert. Bei Drops wie Magischem Metall oder Flamme des Drachen hat der Charakter, der den Drop erhält, das Recht, das Item für die Hälfte des Marktpreises von der Gilde zu erwerben. Andernfalls wird das Item ebenfalls ins Gildenlager gelegt.')}\n‎ `,
				embeds: [embed],
				files: [file],
				components: [dmgRow, dmg2Row],
			});

			const collector = frontMageMessage.createMessageComponentCollector({ componentType: ComponentType.Button, time: collectorTime });

			const userAbmeldungen = [];
			collector.on('collect', async m => {

				memberAmount = (parseInt(memberAmount) + 1);
				totalDamage = (parseInt(totalDamage) + parseInt(m.customId));

				if (parseInt(totalDamage) >= parseInt(neededDamage)) {
					status = 'Gesamtschaden erreicht';
					color = 0x37eb34;
				}
				else {
					status = 'Nicht genug Gesamtschaden';
					color = 0xf522e3;
				}

				const embedUpdate = {
					color: color,
					title: 'Frontmagier',
					thumbnail: {
						url: 'attachment://fronti.png',
					},
					fields: [
						{ name: 'Uhrzeit:', value: spawnDate.toLocaleString('de-DE', {
							hour: '2-digit',
							minute: '2-digit',
						}), inline: true },
						{ name: 'Datum:', value: spawnDate.toLocaleString('de-DE', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						}), inline: true },
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Angemeldete Member:', value: memberAmount, inline: true },
						{ name: 'Gesamtschaden (in K):', value: totalDamage, inline: true },
						{ name: '\u200B', value: '\u200B', inline: false },
						{ name: 'Benötigter Schaden:', value: neededDamage, inline: true },
						{ name: 'Status:', value: status, inline: true },
					],
				};

				m.message.edit({ embeds: [embedUpdate], files: [file] });

				const abmeldenButton = new ButtonBuilder()
					.setCustomId('abmelden')
					.setLabel('Die Anmeldung zurückziehen')
					.setStyle(ButtonStyle.Danger);

				const abmeldeRow = new ActionRowBuilder().addComponents(abmeldenButton);

				const abmeldeResposnse = await m.reply({ components: [abmeldeRow], content: 'Angemeldet mit ' + m.customId + 'K Schaden', ephemeral: true, fetchReply: true });
				const collector2 = abmeldeResposnse.createMessageComponentCollector({ componentType: ComponentType.Button });

				// Absage interaction
				collector2.on('collect', async m2 => {
					memberAmount = (parseInt(memberAmount) - 1);
					totalDamage = (parseInt(totalDamage) - parseInt(m.customId));

					userAbmeldungen.push(m2.user.id);

					if (parseInt(totalDamage) >= parseInt(neededDamage)) {
						status = 'Gesamtschaden erreicht';
						color = 0x37eb34;
					}
					else {
						status = 'Nicht genug Gesamtschaden';
						color = 0xf522e3;
					}

					const embedUpdateAbmeldung = {
						color: color,
						title: 'Frontmagier',
						thumbnail: {
							url: 'attachment://fronti.png',
						},
						fields: [
							{ name: 'Uhrzeit:', value: spawnDate.toLocaleString('de-DE', {
								hour: '2-digit',
								minute: '2-digit',
							}), inline: true },
							{ name: 'Datum:', value: spawnDate.toLocaleString('de-DE', {
								day: '2-digit',
								month: '2-digit',
								year: 'numeric',
							}), inline: true },
							{ name: '\u200B', value: '\u200B', inline: false },
							{ name: 'Angemeldete Member:', value: memberAmount, inline: true },
							{ name: 'Gesamtschaden (in K):', value: totalDamage, inline: true },
							{ name: '\u200B', value: '\u200B', inline: false },
							{ name: 'Benötigter Schaden:', value: neededDamage, inline: true },
							{ name: 'Status:', value: status, inline: true },
						],
					};

					m.message.edit({ embeds: [embedUpdateAbmeldung], files: [file] });
					m.deleteReply();
					m2.reply({ content: 'Erfolgreich abgemeldet', ephemeral: true });
					await wait(15_000);
					m2.deleteReply();
				});

				await wait(collectorTime);
				try {
					await m.deleteReply();
				}
				catch {
					return;
				}
			});

			collector.on('end', async m => {
				if (status === 'Gesamtschaden erreicht') {
					await channel.threads.create({
						name: `Front-Magier ${spawnDate.toLocaleString('de-DE', {
							hour: '2-digit',
							minute: '2-digit',
						})} Uhr - ${spawnDate.toLocaleString('de-DE', {
							day: '2-digit',
							month: '2-digit',
							year: 'numeric',
						})}`,
						reason: 'Dropps etc',
					});
				}

				const usersToPing = [];
				m.forEach((buttonInteraction) => {
					usersToPing.push(buttonInteraction.user.id);
				});

				userAbmeldungen.forEach((userId) => {
					const index = usersToPing.indexOf(userId);
					if (index > -1) {
						usersToPing.splice(index, 1);
					}
				});

				const usersToPingUnique = [... new Set(usersToPing) ];

				usersToPingUnique.forEach(async (user) => {
					let contentString = '';
					if (status === 'Gesamtschaden erreicht') {
						contentString = `<@${user}> --- Der Front-Magier spawnt in 5 Minuten. Bitte keine Dungeons mehr starten! Alle dropps bitte Screenshoten und im unten erstellten Thread teilen.`;
					}
					else {
						contentString = `<@${user}> --- Der Front-Magier wurde abgesagt.`;
					}

					// TODO: Dont use first() here. Filter for a Message with user.id of user
					const uniqueUserInteraction = m.find((a) => {
						return a.user.id === user;
					});
					const endMessage = await uniqueUserInteraction.followUp({ content:  contentString, ephemeral: true });

					await wait(300_000);
					uniqueUserInteraction.deleteReply(endMessage);
				});
			});

			await wait(deleteFMM);
			frontMageMessage.delete();
		});

		frontMageMessageCron.start();
	},
};