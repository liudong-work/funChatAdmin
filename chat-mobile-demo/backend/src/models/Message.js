import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '消息UUID'
  },
  sender_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '发送者ID'
  },
  receiver_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '接收者ID'
  },
  message_type: {
    type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'file'),
    defaultValue: 'text',
    comment: '消息类型'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '消息内容'
  },
  file_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '文件URL'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已读'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '阅读时间'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read', 'deleted'),
    defaultValue: 'sent',
    comment: '消息状态'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  underscored: true,
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['uuid']
    },
    {
      fields: ['sender_id']
    },
    {
      fields: ['receiver_id']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Message;
