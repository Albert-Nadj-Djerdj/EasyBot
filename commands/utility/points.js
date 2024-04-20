const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { Sequelize, DataTypes, Op } = require('sequelize');
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

const Member = require('../../sequilize/members')(sequelize, DataTypes);
const Character = require('../../sequilize/characters')(sequelize, DataTypes);
const DopePoints = require('../../sequilize/dope_points')(sequelize, DataTypes);

Member.hasOne(DopePoints);
DopePoints.belongsTo(Member);

Member.hasMany(Character);
Character.belongsTo(Member);

module.exports = {
	data: new SlashCommandBuilder()
		.setName('points')
		.setDescription('Add or remove X amount of Dope-Points to the contribution pot of a member.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('add')
				.setDescription('Add X amount of Dope-Points to a members contribution pot')
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
						.setDescription('Amount to remove from pot')
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
						.setDescription('Amount to set as contribution sum')
						.setRequired(true)
						.setMinValue(1),
				),
		)
		.setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
		.setDMPermission(false),
	async execute(interaction) {

		if (interaction.options.getSubcommand() === 'add') {
			await interaction.deferReply({ ephemeral: true });

			const member = interaction.options.getUser('member');
			const amount = interaction.options.getInteger('amount');

			const memberDB = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: member.username,
					},
				},
			}, {
				includes: [Character],
			});

			const [dopePoints] = await DopePoints.findOrCreate({
				where: { memberId: memberDB.dataValues.id },
				defaults: {
					memberId: memberDB.dataValues.id,
				},
			});

			await dopePoints.update({
				dope_points: dopePoints.dataValues.dope_points + amount,
			});


			const dopePointsChannel = await interaction.member.guild.channels.fetch(process.env.DOPE_POINTS_CHANNEL_ID);
			await dopePointsChannel.send({ content: `<@${member.id}> earned **${amount}** Dope Points!` });

			const memberProfileChannel = await interaction.member.guild.channels.fetch(memberDB.dataValues.member_profile_post_id);
			const memberProfileChannelMessages = await memberProfileChannel.messages.fetch();

			const memberProfileChannelMessage = Array.from(memberProfileChannelMessages.values()).pop();

			const memberProfileEmbed = require(path.join(__dirname, '../../events/embeds/memberProfileEmbed.js'));
			const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(memberDB);

			const profileButtonsRow = require(path.join(__dirname, '../../events/actionrows/profileButtonsRow.js'));
			const profileButtonsRowCreated = await profileButtonsRow.rowCreate(memberDB, interaction.member.guild);

			const dopePointsEmbed = require(path.join(__dirname, '../../events/embeds/dopePointsEmbed.js'));
			const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(memberDB, DopePoints);

			await memberProfileChannelMessage.edit({ content: ' ', embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

			await interaction.editReply({ content:'Points added succesfully', ephemeral: true, fetchReply: true }).then(() => {
				setTimeout(async () => {
					try {
						await interaction.deleteReply();

					}
					catch (e) {
						console.log(e);
					}
				}, 20_000);
			}).catch((e) => { console.log(e); });
		}
		else if (interaction.options.getSubcommand() === 'remove') {
			await interaction.deferReply({ ephemeral: true });
			const member = interaction.options.getUser('member');
			const amount = interaction.options.getInteger('amount');

			const memberDB = await Member.findOne({
				where: {
					discord_name: {
						[Op.eq]: member.username,
					},
				},
			}, {
				includes: [Character],
			});

			const [dopePoints] = await DopePoints.findOrCreate({
				where: { memberId: memberDB.dataValues.id },
				defaults: {
					memberId: memberDB.dataValues.id,
				},
			});

			await dopePoints.update({
				dope_points: dopePoints.dataValues.dope_points - amount,
			});

			const memberProfileChannel = await interaction.member.guild.channels.fetch(memberDB.dataValues.member_profile_post_id);
			const memberProfileChannelMessages = await memberProfileChannel.messages.fetch();

			const memberProfileChannelMessage = Array.from(memberProfileChannelMessages.values()).pop();

			const memberProfileEmbed = require(path.join(__dirname, '../../events/embeds/memberProfileEmbed.js'));
			const memberProfileEmbedCreated = await memberProfileEmbed.embedCreate(memberDB);

			const profileButtonsRow = require(path.join(__dirname, '../../events/actionrows/profileButtonsRow.js'));
			const profileButtonsRowCreated = await profileButtonsRow.rowCreate(memberDB, interaction.member.guild);

			const dopePointsEmbed = require(path.join(__dirname, '../../events/embeds/dopePointsEmbed.js'));
			const dopePointsEmbedCreated = await dopePointsEmbed.embedCreate(memberDB, DopePoints);

			await memberProfileChannelMessage.edit({ content: ' ', embeds: [memberProfileEmbedCreated, dopePointsEmbedCreated], components: [profileButtonsRowCreated] });

			await interaction.editReply({ content:'Points removed succesfully', ephemeral: true, fetchReply: true }).then(() => {
				setTimeout(async () => {
					try {
						await interaction.deleteReply();

					}
					catch (e) {
						console.log(e);
					}
				}, 20_000);
			}).catch((e) => { console.log(e); });
		}
		else if (interaction.options.getSubcommand() === 'set') {
			const amount = interaction.options.getInteger('amount');

			await DopePoints.update({
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