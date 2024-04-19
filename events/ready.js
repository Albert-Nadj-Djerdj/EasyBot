const { Events } = require('discord.js');
// const { bold, ComponentType, quote } = require('discord.js');
// const wait = require('node:timers/promises').setTimeout;
const fs = require('node:fs');
const path = require('node:path');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		const guild = client.guilds.cache.get(process.env.GUILD_ID);

		await guild.members.fetch();

		// Load all Events from the ready folder
		const eventsPath = path.join(__dirname, 'ready');
		const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

		for (const file of eventFiles) {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			event.execute(client);
		}

		// Post the Front-Mage-Event Message
		/* const frontMageMessageCron = new cron.CronJob('30 10,16,22 * * *', async () => {

			const channel = guild.channels.cache.get(process.env.BOSS_CHANNEL_ID);

			const collectorTime = 1_500_000;
			const deleteFMM = 1_800_000;
			const hours = new Date().getHours() + 2;
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
				content: `Hey <@&${process.env.FRONTI_MENTION_ID}>, \n\nder Kampf gegen den Front-Magier beginnt um ${spawnDate.getHours()} Uhr. Wenn ihr teilnehmen möchtet, reagiert bitte mit eurem ungefähren Schaden.\nDer Status bezüglich des erzielten Schadens wird 15 Minuten vor dem Spawn bekannt gegeben. Bei ausreichender Teilnahme treffen wir uns 2 Minuten vorher am Spawnpoint.\n\n ${bold('Beute:')} \n${quote('Alle Cors werden im Gildenlager auf der zweiten Seite platziert. Bei Drops wie Magischem Metall oder Flamme des Drachen hat der Charakter, der den Drop erhält, das Recht, das Item für die Hälfte des Marktpreises von der Gilde zu erwerben. Andernfalls wird das Item ebenfalls ins Gildenlager gelegt.')}\n\nDie Anmeldung endet 5 Minuten vor Spawn!`,
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

				m.reply({ components: [abmeldeRow], content: 'Angemeldet mit ' + m.customId + 'K Schaden', ephemeral: true, fetchReply: true }).then(repliedMessage => {
					const collector2 = repliedMessage.createMessageComponentCollector({ componentType: ComponentType.Button });

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
				}).catch((e) => console.log(e));
			});

			collector.on('end', async m => {
				let thread = '';
				if (status === 'Gesamtschaden erreicht') {
					thread = await channel.threads.create({
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
						contentString = `<@${user}> --- Der Front-Magier spawnt in 5 Minuten. Bitte keine Dungeons mehr starten! Alle dropps bitte Screenshoten und im unten erstellten Thread teilen.\n<#${thread.id}>`;
					}
					else {
						contentString = `<@${user}> --- Der Front-Magier wurde abgesagt.`;
					}

					const res = await guild.members.fetch();
					const schuldnerObjekt = res.find((member) => member.user.id === user);
					schuldnerObjekt.send({ content:  contentString }).catch((e) => { console.log(e); });
				});
			});

			await wait(deleteFMM);
			frontMageMessage.delete();
		});

		frontMageMessageCron.start(); */
	},
};