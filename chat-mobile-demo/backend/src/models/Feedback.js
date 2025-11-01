import { DataTypes } from 'sequelize';

export default (sequelize) => {
  const Feedback = sequelize.define('Feedback', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    uuid: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '反馈唯一标识'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: '用户ID'
    },
    user_uuid: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '用户UUID'
    },
    type: {
      type: DataTypes.ENUM('bug', 'feature', 'complaint', 'other'),
      defaultValue: 'other',
      comment: '反馈类型：bug-错误报告, feature-功能建议, complaint-投诉, other-其他'
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: '反馈内容'
    },
    images: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '图片URLs，JSON数组格式',
      get() {
        const value = this.getDataValue('images');
        return value ? JSON.parse(value) : [];
      },
      set(value) {
        this.setDataValue('images', JSON.stringify(value || []));
      }
    },
    contact: {
      type: DataTypes.STRING(100),
      allowNull: true,
      comment: '联系方式（可选）'
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'resolved', 'closed'),
      defaultValue: 'pending',
      comment: '处理状态：pending-待处理, processing-处理中, resolved-已解决, closed-已关闭'
    },
    reply: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '管理员回复'
    },
    admin_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: '处理管理员ID'
    },
    replied_at: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: '回复时间'
    },
    device_info: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: '设备信息（JSON格式）',
      get() {
        const value = this.getDataValue('device_info');
        return value ? JSON.parse(value) : null;
      },
      set(value) {
        this.setDataValue('device_info', JSON.stringify(value || null));
      }
    },
    app_version: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '应用版本'
    },
  }, {
    tableName: 'feedbacks',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      {
        fields: ['user_id']
      },
      {
        fields: ['user_uuid']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['created_at']
      }
    ]
  });

  return Feedback;
};

