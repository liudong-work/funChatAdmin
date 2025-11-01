import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const BottleConfig = sequelize.define('BottleConfig', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
    comment: '配置键名'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: '配置值'
  },
  description: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '配置描述'
  },
  type: {
    type: DataTypes.ENUM('string', 'number', 'boolean', 'json'),
    defaultValue: 'string',
    comment: '配置值类型'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否启用'
  }
}, {
  tableName: 'bottle_configs',
  timestamps: true,
  underscored: true,
  comment: '漂流瓶配置表'
});

export default BottleConfig;
