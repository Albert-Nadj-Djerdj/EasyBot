const { Client, GatewayIntentBits, Events, ButtonBuilder, ActionRowBuilder, ButtonStyle, EmbedBuilder, UserSelectMenuBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');
require('dotenv').config();
// const fs = require('node:fs');
// const path = require('node:path');
const wait = require('node:timers/promises').setTimeout;
const { Sequelize, DataTypes, Op } = require('sequelize');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });

const sequelize = new Sequelize(
	'easybot',
	'root',
	'',
	{
		host: '127.0.0.1',
		dialect: 'mysql',
	},
);

sequelize.authenticate().then(() => {
	console.log('Connection has been established successfully.');
}).catch((error) => {
	console.error('Unable to connect to the database: ', error);
});

const Bond = sequelize.define('bond', {
	creditor: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	debtor: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	bond: {
		type: DataTypes.STRING,
		allowNull: false,
	},
	active: {
		type: DataTypes.BOOLEAN,
		allowNull: false,
	},
});

sequelize.sync().then(() => {
	console.log('Schuldschein table created successfully!');
}).catch((error) => {
	console.error('Unable to create table : ', error);
});

// Load all Commands from the commands folder
/* client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		// Set a new item in the Collection with the key as the command name and the value as the exported module
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		}
		else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Load all Events from the events folder
 const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
	const filePath = path.join(eventsPath, file);
	const event = require(filePath);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	}
	else {
		client.on(event.name, (...args) => event.execute(...args));
	}
} */

client.once(Events.ClientReady, async () => {
	const guild = client.guilds.cache.get(process.env.GUILD_ID);
	const channels = await guild.channels.fetch();

	const schuldscheinChannel = channels.find((channel) => channel.name === 'schuldscheine');


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

	await schuldscheinChannel.send({ embeds: [schuldscheinEmbed], components: [embedDialogRow] });
});

// Respond to Button-clicks
client.on(Events.InteractionCreate, async buttonInteraction => {
	if (!buttonInteraction.isButton()) return;
	await buttonInteraction.deferReply({ ephemeral: true });

	if (buttonInteraction.customId === 'create') {
		const selectMenu = new UserSelectMenuBuilder({
			custom_id: 'schuldner_selection',
			placeholder: 'Wähle den Schuldner',
			max_values: 1,
		});

		const userSelectRow = new ActionRowBuilder().addComponents(selectMenu);

		const createActionResponse = await buttonInteraction.editReply({ content: 'Wähle den Schuldner:', components: [userSelectRow], ephemeral: true });
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
	if (buttonInteraction.customId === 'list') {
		const bonds = await Bond.findAll({
			where: {
				[Op.or]: [
					{
						creditor: {
							[Op.like]: buttonInteraction.user.globalName,
						},
					},
					{
						debtor: {
							[Op.like]: buttonInteraction.user.globalName,
						},
					},
				],
				active: true,
			},
		});

		if (bonds.length === 0) {
			await buttonInteraction.followUp({ content: 'nothing', ephemeral: true });
		}
		else {
			const embeds = [];

			bonds.forEach(async (bond) => {
				const embed = {
					color: 0xf522e3,
					title: 'Schuldschein',
					fields: [
						{ name: 'Kreditor:', value: `${bond.dataValues.creditor}`, inline: true },
						{ name: 'Debitor:', value: `${bond.dataValues.debtor}`, inline: true },
						{ name: 'Schuldverschreibung:', value: `${bond.dataValues.bond}`, inline: true },
						{ name: 'Erstellt am:', value: `${bond.dataValues.createdAt}`, inline: true },
					],
				};

				if (bond.dataValues.creditor === buttonInteraction.user.globalName) {
					const deleteButton = new ButtonBuilder()
						.setCustomId('delete')
						.setLabel('Schuldschein schließen')
						.setStyle(ButtonStyle.Danger);

					const deleteDialogRow = new ActionRowBuilder()
						.addComponents(deleteButton);

					const bondEmbed = await buttonInteraction.followUp({ embeds: [embed], components: [deleteDialogRow], ephemeral: true });
					embeds.push(bondEmbed);
				}
				else {
					const bondEmbed = await buttonInteraction.followUp({ embeds: [embed], ephemeral: true });
					embeds.push(bondEmbed);
				}
			});

			await wait(300_000);
			console.log('start');
			embeds.forEach((em) => {
				buttonInteraction.deleteReply(em);
			});
		}
	}
});

// Respond to Modals
client.on(Events.InteractionCreate, async modalInteraction => {
	if (!modalInteraction.isModalSubmit()) return;
	if (modalInteraction.customId === 'schuldschein_modal') {
		await modalInteraction.reply({
			content: 'Warte auf die Bestätigung des Schuldners...',
			files: [{
				attachment: 'https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTdmYnBqdmZmdmV1bGo1cHRoejF3c3I0amQyZXU2cGJpa254M3V0aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3oEjI6SIIHBdRxXI40/giphy.gif',
				name: 'loading_spinner.gif',
			}],
			ephemeral: true,
		});

		const guild = client.guilds.cache.get(process.env.GUILD_ID);
		const res = await guild.members.fetch();
		const schuldnerObjekt = res.find((member) => member.user.globalName === modalInteraction.fields.getTextInputValue('schuldner'));

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

		const schuldnerResponse = await schuldnerObjekt.send({ content: 'Der Benutzer "' + modalInteraction.user.globalName + '" hat ein Schuldschein erstellt. Inhalt der Schuldbeschreibung: ' + modalInteraction.fields.getTextInputValue('schuldverschreibung'), components: [startDialogRow] });

		const selectedAction = await schuldnerResponse.awaitMessageComponent();

		if (selectedAction.customId === 'accept') {
			await modalInteraction.editReply({
				content: 'Der Schuldner hat den Schuldschein bestätigt',
				files: [{
					attachment: 'https://icon2.cleanpng.com/20180420/zlw/kisspng-check-mark-clip-art-check-vector-5ada906a257947.8642914715242732581535.jpg',
					name: 'accept.jpg',
				}],
				ephemeral: true,
			});

			await selectedAction.editReply({ content: 'Vielen Dank für die Bestätigung!' });

			Bond.create({
				creditor: modalInteraction.user.globalName,
				debtor: modalInteraction.fields.getTextInputValue('schuldner'),
				bond: modalInteraction.fields.getTextInputValue('schuldverschreibung'),
				active: true,
			});

			await wait(60_000);
			await modalInteraction.deleteReply();
		}
		else {
			await modalInteraction.editReply({
				content: 'Der Schuldner hat den Schuldschein abgelehnt',
				files: [{
					attachment: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Red_x.svg/600px-Red_x.svg.png',
					name: 'decline.jpg',
				}],
				ephemeral: true,
			});

			await selectedAction.editReply({ content:'You Motherfucker!' });
			await wait(60_000);
			await modalInteraction.deleteReply();
		}
	}

});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);