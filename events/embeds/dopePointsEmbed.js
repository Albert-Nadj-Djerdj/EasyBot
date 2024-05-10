module.exports = {
	name: 'memberProfileEmbed',
	async embedCreate(member, DopePoints) {

		const [dopePoints] = await DopePoints.findOrCreate({
			where: { memberId: member.dataValues.id },
			defaults: {
				dope_points: 20,
				memberId: member.dataValues.id,
				contribution_sum: 25,
			},
		});

		return {
			color: 0x3464eb,
			title: 'Dope-Points',
			fields: [
				{ name: 'Amount:', value: dopePoints.dataValues.dope_points },
				{ name: 'Contribution amount:', value: dopePoints.dataValues.contribution_sum },
			],
		};
	},
};