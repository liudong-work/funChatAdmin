import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orderId: {
    type: DataTypes.STRING(64),
    allowNull: false,
    unique: true,
    comment: '订单号'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  productId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '商品ID'
  },
  productType: {
    type: DataTypes.STRING(32),
    allowNull: false,
    comment: '商品类型'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '支付金额'
  },
  description: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '商品描述'
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'cancelled', 'refunded'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '订单状态'
  },
  paymentMethod: {
    type: DataTypes.ENUM('wechat', 'alipay'),
    allowNull: false,
    comment: '支付方式'
  },
  transactionId: {
    type: DataTypes.STRING(64),
    allowNull: true,
    comment: '第三方交易号'
  },
  paidAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  refundedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '退款时间'
  },
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    comment: '退款金额'
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  underscored: true,
  comment: '订单表'
});

// 定义关联关系
Order.associate = (models) => {
  // 订单属于用户
  Order.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
};

export default Order;
