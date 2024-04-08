module.exports = function(sequelize, DataTypes) {
	return sequelize.define('member', {
		discord_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		discord_global_name: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		member_since: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		is_active: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
		},
		member_profile_post_id: {
			type: DataTypes.STRING,
			allowNull: true,
		},
	});
};