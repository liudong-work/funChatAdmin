import { DataTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import sequelize from '../config/database.js';

const Bottle = sequelize.define('Bottle', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
    comment: '瓶子ID'
  },
  uuid: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    comment: '瓶子UUID'
  },
  sender_uuid: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: '发送者UUID'
  },
  receiver_uuid: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '接收者UUID'
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '瓶子内容'
  },
  mood: {
    type: DataTypes.STRING(20),
    allowNull: true,
    comment: '心情标签'
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '投放位置'
  },
  status: {
    type: DataTypes.ENUM('sea', 'picked', 'replied', 'deleted'),
    defaultValue: 'sea',
    comment: '瓶子状态'
  },
  picked_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '被捞起时间'
  }
}, {
  tableName: 'bottles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  deletedAt: 'deleted_at',
  paranoid: true,
  hooks: {
    beforeCreate: (bottle) => {
      if (!bottle.uuid) {
        bottle.uuid = uuidv4();
      }
    }
  },
  indexes: [
    {
      fields: ['uuid'],
      unique: true
    },
    {
      fields: ['sender_uuid']
    },
    {
      fields: ['receiver_uuid']
    },
    {
      fields: ['status']
    }
  ]
});

export default Bottle;
