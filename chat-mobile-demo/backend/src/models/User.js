import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  uuid: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: '用户UUID'
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    comment: '手机号'
  },
  username: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: '用户名'
  },
  nickname: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '昵称'
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
    comment: '密码（加密）'
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '邮箱'
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '头像'
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '个人简介'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'banned'),
    defaultValue: 'active',
    comment: '用户状态'
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '最后登录时间'
  }
}, {
  tableName: 'users',
  timestamps: true,
  underscored: true,
  paranoid: true, // 软删除
  indexes: [
    {
      unique: true,
      fields: ['uuid']
    },
    {
      unique: true,
      fields: ['phone']
    },
    {
      fields: ['status']
    }
  ]
});

export default User;
