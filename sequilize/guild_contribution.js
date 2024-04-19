module.exports = function(sequelize, DataTypes) {
	return sequelize.define('guild_contribution', {
		contribution_sum: {
			type: DataTypes.BIGINT,
			defaultValue: 10,
		},
		cuntribution_pot: {
			type: DataTypes.BIGINT,
			defaultValue: 0,
		},
	});
};