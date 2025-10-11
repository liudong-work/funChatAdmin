import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Follow = sequelize.define('Follow', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  follower_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关注者ID'
  },
  following_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '被关注者ID'
  },
  status: {
    type: DataTypes.ENUM('active', 'cancelled'),
    defaultValue: 'active',
    comment: '关注状态'
  }
}, {
  tableName: 'follows',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['follower_id', 'following_id'],
      name: 'unique_follow'
    },
    {
      fields: ['follower_id']
    },
    {
      fields: ['following_id']
    },
    {
      fields: ['status']
    }
  ]
});

export default Follow;

