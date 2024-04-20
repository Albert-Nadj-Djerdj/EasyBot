const { Events } = require('discord.js');
const { Sequelize, DataTypes } = require('sequelize');
const path = require('node:path');

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
const Bond = require('../sequilize/bond')(sequelize, DataTypes);
const DungeonQueue = require('../sequilize/dg_queues')(sequelize, DataTypes);
const DopePoints = require('../sequilize/dope_points')(sequelize, DataTypes);

Member.hasMany(Character);
Character.belongsTo(Member);

Member.hasOne(DopePoints);
DopePoints.belongsTo(Member);

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
				const createNewBondButton = require(path.join(__dirname, 'interactionCreate/buttons/createNewBondButton.js'));
				createNewBondButton.execute(interaction);
			}

			// React to "List my Bonds" button
			if (interaction.customId === 'list') {
				const listMyBondsButton = require(path.join(__dirname, 'interactionCreate/buttons/listMyBondsButton.js'));
				listMyBondsButton.execute(interaction, Bond);
			}

			// React to "Delete this Bond" button
			if (interaction.customId === 'delete') {
				const deleteBondButton = require(path.join(__dirname, 'interactionCreate/buttons/deleteBondButton.js'));
				deleteBondButton.execute(interaction, Bond);
			}

			// React to "Mainchar bearbeiten" button
			if (interaction.customId === 'mainchar_edit') {
				const editMaincharButton = require(path.join(__dirname, 'interactionCreate/buttons/editMaincharButton.js'));
				editMaincharButton.execute(interaction, Character, Member, DopePoints);
			}

			// React to "Nebenchar erstellen" button
			if (interaction.customId === 'nebenchar_create') {
				const createSecondaryCharButton = require(path.join(__dirname, 'interactionCreate/buttons/createSecondaryCharButton.js'));
				createSecondaryCharButton.execute(interaction, DopePoints);
			}

			// React to "Nebenchar löschen" button
			if (interaction.customId === 'nebenchar_delete') {
				const deleteSecondaryCharButton = require(path.join(__dirname, 'interactionCreate/buttons/deleteSecondaryCharButton.js'));
				deleteSecondaryCharButton.execute(interaction, Member, Character, DopePoints);
			}

			// React to "Abwesenheit anmelden" button
			if (interaction.customId === 'abwesenheit_anmelden') {
				const registerAbsenceButton = require(path.join(__dirname, 'interactionCreate/buttons/registerAbsenceButton.js'));
				registerAbsenceButton.execute(interaction);
			}

			// React to "Wieder zurück!" button
			if (interaction.customId === 'anwesenheit_melden') {
				const registerPresenceButton = require(path.join(__dirname, 'interactionCreate/buttons/registerPresenceButton.js'));
				registerPresenceButton.execute(interaction, Member, DopePoints);
			}

			// React to "Queue starten" Button
			if (interaction.customId === 'start_dq') {
				const startDungeonQueueButton = require(path.join(__dirname, 'interactionCreate/buttons/startDungeonQueueButton.js'));
				startDungeonQueueButton.execute(interaction, DungeonQueue);
			}

			// React to "Queue stoppen" Button
			if (interaction.customId === 'stop_dq') {
				const stopDungeonQueueButton = require(path.join(__dirname, 'interactionCreate/buttons/stopDungeonQueueButton.js'));
				stopDungeonQueueButton.execute(interaction, DungeonQueue);
			}
		}

		// Modal submits
		if (interaction.isModalSubmit()) {
			// React to "Create bond modal"
			if (interaction.customId === 'schuldschein_modal') {
				const createNewBondModal = require(path.join(__dirname, 'interactionCreate/modals/createNewBondModal.js'));
				createNewBondModal.execute(interaction, Bond);
			}

			// React to "Mainchar edit modal"
			if (interaction.customId === 'mainchar_modal') {
				const editMaincharModal = require(path.join(__dirname, 'interactionCreate/modals/editMaincharModal.js'));
				editMaincharModal.execute(interaction, Member, Character, DopePoints);
			}

			// React to "Nebenchar create modal"
			if (interaction.customId === 'nebenchar_modal') {
				const createSecondaryCharModal = require(path.join(__dirname, 'interactionCreate/modals/createSecondaryCharModal.js'));
				createSecondaryCharModal.execute(interaction, Member, Character, DopePoints);
			}

			// React to "Abwesenheit modal"
			if (interaction.customId === 'abwesenheit_modal') {
				const registerAbsenceModal = require(path.join(__dirname, 'interactionCreate/modals/registerAbsenceModal.js'));
				registerAbsenceModal.execute(interaction, Member, Character, DopePoints);
			}
		}
	},
};