module.exports = function(sequelize, DataTypes) {
	return sequelize.define('dq_queue', {
		discord_name: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		discord_id: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		thread_id: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		dungeon: {
			type: DataTypes.STRING,
			allowNull: true,
		},
		status: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
		success: {
			type: DataTypes.BOOLEAN,
			allowNull: true,
		},
	});
};