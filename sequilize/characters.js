module.exports = function(sequelize, DataTypes) {
	return sequelize.define('character', {
		character_name: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		is_main: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
		is_guild: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
	});
};