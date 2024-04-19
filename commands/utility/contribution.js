const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');

const sequelize = new Sequelize(
	process.env.DATABASE_NAME,
	process.env.DATABASE_USER,
	process.env.DATABASE_PW,
	{
		host: process.env.DATABASE_HOST,
		dialect: 'mysql',
	},
);

const Member = require('../../sequilize/members')(sequelize, DataTypes);
const Contribution = require('../../sequilize/guild_contribution')(sequelize, DataTypes);

Member.hasOne(Contribution);
Contribution.belongsTo(Member);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('contribution')
		.setDescription('Add or remove X amount of Points to the contribution pot of a member.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add X amount to members contribution pot')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('Amount to add from pot (in KK / Millions)')
						.setRequired(true)
						.setMinValue(1),
				)
				.addUserOption(option =>
					option.setName('member')
						.setDescription('Member to edit pot')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove')
				.setDescription('Remove X amount from members contribution pot')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('Amount to remove from pot (in KK / Millions)')
						.setRequired(true)
						.setMinValue(1),
				)
				.addUserOption(option =>
					option.setName('member')
						.setDescription('Member to edit pot')
						.setRequired(true),
				),
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('set')
				.setDescription('Edit weekly contribution sum (for everyone)')
				.addIntegerOption(option =>
					option.setName('amount')
						.setDescription('Amount to set as contribution sum (in KK / Millions)')
						.setRequired(true)
						.setMinValue(1),
				),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {

		if (interaction.options.getSubcommand() === 'add') {
			const member = interaction.options.getUser('member');
			const amount = interaction.options.getInteger('amount');

			const memberDB = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: member.username,
					},
				},
			});

			const [memberContribution] = await Contribution.findOrCreate({
				where: { memberId: memberDB.dataValues.id },
				defaults: {
					memberId: memberDB.dataValues.id,
				},
			});

			await memberContribution.update({
				cuntribution_pot: memberContribution.dataValues.cuntribution_pot + amount,
			});

			const memberContributionPotEmbed = {
				color: 0x3464eb,
				title: 'Contribution Pot',
				fields: [
					{ name: 'Action:', value: interaction.options.getSubcommand(), inline: true },
					{ name: 'Amount:', value: amount, inline: true },
					{ name: 'new Pot-size:', value: memberContribution.dataValues.cuntribution_pot, inline: true },
				],
			};
			await interaction.reply({ content: `<@${member.id}> your Contribution pot changed:`, embeds: [memberContributionPotEmbed] });
		}
		else if (interaction.options.getSubcommand() === 'remove') {
			const member = interaction.options.getUser('member');
			const amount = interaction.options.getInteger('amount');

			const memberDB = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: member.username,
					},
				},
			});

			const [memberContribution] = await Contribution.findOrCreate({
				where: { memberId: memberDB.dataValues.id },
				defaults: {
					memberId: memberDB.dataValues.id,
				},
			});

			await memberContribution.update({
				cuntribution_pot: memberContribution.dataValues.cuntribution_pot - amount,
			});
			const memberContributionPotEmbed = {
				color: 0x3464eb,
				title: 'Contribution Pot',
				fields: [
					{ name: 'Action:', value: interaction.options.getSubcommand(), inline: true },
					{ name: 'Amount:', value: amount, inline: true },
					{ name: 'new Pot-size:', value: memberContribution.dataValues.cuntribution_pot, inline: true },
				],
			};
			await interaction.reply({ content: `<@${member.id}> your Contribution pot changed:`, embeds: [memberContributionPotEmbed] });
		}
		else if (interaction.options.getSubcommand() === 'set') {
			const amount = interaction.options.getInteger('amount');

			await Contribution.update({
				contribution_sum: amount,
			}, {
				where: {
					contribution_sum: { [Op.ne]: amount },
				},
			});

			await interaction.reply({ content: 'Contribution sum changed', ephemeral: true });
		}
	},
};