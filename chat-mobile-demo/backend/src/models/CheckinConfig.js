import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CheckinConfig = sequelize.define('CheckinConfig', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    continuous_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      comment: '连续签到天数'
    },
    coins_reward: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 10,
      comment: '奖励金币数量'
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用'
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: '奖励描述'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'checkin_configs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['continuous_days']
      }
    ]
  });

  return CheckinConfig;
};
