import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const UserPoints = sequelize.define('UserPoints', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '当前积分'
    },
    total_points: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '累计获得的总积分'
    },
    continuous_days: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '连续签到天数'
    },
    last_checkin_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: '最后签到日期'
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
    tableName: 'user_points',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id']
      }
    ]
  });

  return UserPoints;
};

