import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

const Moment = sequelize.define('Moment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '动态ID'
  },
  uuid: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    comment: '动态UUID'
  },
  user_id: {
    type: DataTypes.STRING(150),
    allowNull: false,
    comment: '发布用户UUID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '动态文本内容'
  },
  images: {
    type: DataTypes.JSON,
    allowNull: true,
    comment: '图片列表(JSON数组)'
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '发布位置'
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
  status: {
    type: DataTypes.ENUM('normal', 'hidden', 'deleted'),
    defaultValue: 'normal',
    comment: '动态状态'
  }
}, {
  tableName: 'moments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (moment) => {
      if (!moment.uuid) {
        moment.uuid = uuidv4();
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['status']
    }
  ]
});

export default Moment;

