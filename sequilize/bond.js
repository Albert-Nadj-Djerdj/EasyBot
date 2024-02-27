module.exports = function(sequelize, DataTypes) {
	return sequelize.define('bond', {
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
};