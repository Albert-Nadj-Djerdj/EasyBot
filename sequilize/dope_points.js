module.exports = function(sequelize, DataTypes) {
	return sequelize.define('dope_points', {
		contribution_sum: {
			type: DataTypes.BIGINT,
			defaultValue: 10,
		},
		dope_points: {
			type: DataTypes.BIGINT,
			defaultValue: 0,
		},
	});
};