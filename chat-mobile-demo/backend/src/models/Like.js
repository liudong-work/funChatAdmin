import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Like = sequelize.define('Like', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '点赞用户ID'
  },
  target_type: {
    type: DataTypes.ENUM('moment', 'comment'),
    allowNull: false,
    comment: '点赞目标类型'
  },
  target_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '点赞目标ID'
  }
}, {
  tableName: 'likes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'target_type', 'target_id'],
      name: 'unique_like'
    },
    {
      fields: ['target_type', 'target_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

export default Like;

