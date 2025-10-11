import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '评论UUID'
  },
  moment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '动态ID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '评论用户ID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '评论内容'
  },
  reply_to_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '回复的评论ID'
  },
  reply_to_user_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '回复的用户ID'
  },
  likes_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞数'
  },
  status: {
    type: DataTypes.ENUM('published', 'deleted'),
    defaultValue: 'published',
    comment: '状态'
  }
}, {
  tableName: 'comments',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['uuid']
    },
    {
      fields: ['moment_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['reply_to_id']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Comment;

