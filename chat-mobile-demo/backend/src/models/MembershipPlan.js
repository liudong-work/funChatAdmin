import { DataTypes } from 'sequelize';

const MembershipPlan = (sequelize) => {
  return sequelize.define('MembershipPlan', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '套餐名称，如：月度会员、季度会员、年度会员'
    },
    type: {
      type: DataTypes.ENUM('monthly', 'quarterly', 'yearly'),
      allowNull: false,
      unique: true,
      comment: '套餐类型'
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: '当前价格（元）'
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: '原价（元）'
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '套餐时长（天数）'
    },
    durationText: {
      type: DataTypes.STRING(20),
      allowNull: false,
      comment: '时长文本，如：1个月、3个月、12个月'
    },
    features: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: '套餐权益列表'
    },
    isPopular: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: '是否为推荐套餐'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否启用'
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序权重，数字越大越靠前'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '套餐描述'
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'membership_plans',
    timestamps: true,
    paranoid: true, // 软删除
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    deletedAt: 'deleted_at',
    indexes: [
      {
        fields: ['type']
      },
      {
        fields: ['isActive']
      },
      {
        fields: ['sortOrder']
      }
    ]
  });
};

export default MembershipPlan;
