import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Conversation = sequelize.define('Conversation', {
  id: {
    type: DataTypes.BIGINT,
    autoIncrement: true,
    primaryKey: true,
    comment: '对话ID'
  },
  uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '对话UUID'
  },
  user1_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '用户1 UUID'
  },
  user2_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '用户2 UUID'
  },
  last_message_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
    comment: '最后一条消息ID'
  },
  last_message_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后消息时间'
  },
  unread_count_user1: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '用户1未读数'
  },
  unread_count_user2: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '用户2未读数'
  }
}, {
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (conversation) => {
      if (!conversation.uuid) {
        // 生成基于两个用户UUID的唯一conversation UUID
        const [uuid1, uuid2] = [conversation.user1_uuid, conversation.user2_uuid].sort();
        conversation.uuid = `conv_${uuid1}_${uuid2}`;
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['user1_uuid']
    },
    {
      fields: ['user2_uuid']
    },
    {
      fields: ['last_message_at']
    },
    {
      fields: ['user1_uuid', 'user2_uuid'],
      unique: true
    }
  ]
});

export default Conversation;

