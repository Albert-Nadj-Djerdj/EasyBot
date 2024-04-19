const { UserSelectMenuBuilder, ActionRowBuilder, TextInputBuilder, ModalBuilder, TextInputStyle } = require('discord.js');

module.exports = {
	name: 'createNewBondButton',
	async execute(interaction) {
		await interaction.deferReply({ ephemeral: true });

		const selectMenu = new UserSelectMenuBuilder({
			custom_id: 'schuldner_selection',
			placeholder: 'Select debtor',
			max_values: 1,
		});

		const userSelectRow = new ActionRowBuilder().addComponents(selectMenu);

		const createActionResponse = await interaction.editReply({ content: 'Select the debtor:', components: [userSelectRow], ephemeral: true });
		const selectedUser = await createActionResponse.awaitMessageComponent();

		const schuldner = new TextInputBuilder().setCustomId('schuldner').setLabel('Debtor:').setStyle(TextInputStyle.Short).setValue(selectedUser.users.first().globalName);
		const schuldnerRow = new ActionRowBuilder().addComponents(schuldner);

		const schuldverschreibung = new TextInputBuilder().setCustomId('schuldverschreibung').setLabel('Credit description:').setStyle(TextInputStyle.Paragraph);
		const schuldverschreibungRow = new ActionRowBuilder().addComponents(schuldverschreibung);

		const modal = new ModalBuilder()
			.setCustomId('schuldschein_modal')
			.setTitle('Create credit');

		modal.addComponents(schuldnerRow, schuldverschreibungRow);

		await selectedUser.showModal(modal);

		selectedUser.deleteReply();
	},
};