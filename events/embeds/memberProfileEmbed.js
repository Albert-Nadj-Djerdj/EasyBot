const { Op } = require('sequelize');

module.exports = {
	name: 'memberProfileEmbed',
	async embedCreate(member) {
		const memberCharacters = await member.getCharacters();
		const memberMainChar = await member.getCharacters({
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

		const fields = [
			{ name: 'Discord:', value: member.dataValues.discord_name, inline: false },
			{ name: '\u200B', value: '\u200B', inline: false },
			{ name: 'Mainchar:', value: memberMainChar[0].dataValues.character_name, inline: false },
		];

		let firstDone = false;
		memberCharacters.forEach((char) => {
			if (!char.dataValues.is_main && !firstDone) {
				fields.push({ name: '\u200B', value: '\u200B', inline: false });
				fields.push({ name: 'Secondary char:', value: char.dataValues.character_name, inline: true });
				fields.push({ name: 'in guild:', value: char.dataValues.is_guild, inline: true });
				fields.push({ name: '\u200B', value: '\u200B', inline: true });

				firstDone = true;
			}
			else if (!char.dataValues.is_main) {
				fields.push({ name: 'Secondary char:', value: char.dataValues.character_name, inline: true });
				fields.push({ name: 'in guild:', value: char.dataValues.is_guild, inline: true });
				fields.push({ name: '\u200B', value: '\u200B', inline: true });
			}
		});

		return {
			color: 0xf522e3,
			title: 'Member Profile',
			fields,
		};
	},
};