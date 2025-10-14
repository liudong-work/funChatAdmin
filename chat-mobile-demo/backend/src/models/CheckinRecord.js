import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const CheckinRecord = sequelize.define('CheckinRecord', {
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
    checkin_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: '签到日期'
    },
    points_earned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: '本次签到获得的积分'
    },
    continuous_days: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: '签到时的连续天数'
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'checkin_records',
    timestamps: true,
    updatedAt: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'checkin_date']
      },
      {
        fields: ['checkin_date']
      }
    ]
  });

  return CheckinRecord;
};

