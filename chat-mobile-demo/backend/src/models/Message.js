import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    comment: '消息ID'
  },
  uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '消息UUID'
  },
  conversation_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '对话UUID'
  },
  sender_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '发送者UUID'
  },
  receiver_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '接收者UUID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '消息内容'
  },
  type: {
    type: DataTypes.ENUM('text', 'image', 'audio', 'video', 'file', 'bottle'),
    defaultValue: 'text',
    comment: '消息类型'
  },
  status: {
    type: DataTypes.ENUM('sent', 'delivered', 'read', 'deleted'),
    defaultValue: 'sent',
    comment: '消息状态'
  },
  bottle_uuid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '关联瓶子UUID'
  },
  media_url: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '媒体文件URL'
  }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (message) => {
      if (!message.uuid) {
        message.uuid = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['conversation_uuid']
    },
    {
      fields: ['sender_uuid']
    },
    {
      fields: ['receiver_uuid']
    },
    {
      fields: ['bottle_uuid']
    },
    {
      fields: ['created_at']
    }
  ]
});

export default Message;

