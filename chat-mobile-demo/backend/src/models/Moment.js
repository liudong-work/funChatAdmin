import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Moment = sequelize.define('Moment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '动态UUID'
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '动态内容'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '图片列表'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '位置'
  },
  visibility: {
    type: DataTypes.ENUM('public', 'friends', 'private'),
    defaultValue: 'public',
    comment: '可见性'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'published', 'draft', 'deleted'),
    defaultValue: 'pending',
    comment: '状态'
  },
  likes_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '点赞数'
  },
  comments_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '评论数'
  },
  shares_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '分享数'
  },
  reviewed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '审核时间'
  },
  reviewed_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: '审核人ID'
  },
  review_comment: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '审核备注'
  }
}, {
  tableName: 'moments',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['uuid']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Moment;
