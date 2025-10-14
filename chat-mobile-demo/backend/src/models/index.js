import sequelize from '../config/database.js';
import User from './User.js';
import Moment from './Moment.js';
import Comment from './Comment.js';
import Like from './Like.js';
import Follow from './Follow.js';
import Message from './Message.js';
import Bottle from './Bottle.js';
import UserPointsModel from './UserPoints.js';
import CheckinRecordModel from './CheckinRecord.js';

// 初始化积分相关模型
const UserPoints = UserPointsModel(sequelize);
const CheckinRecord = CheckinRecordModel(sequelize);

// ========== 定义模型关联 ==========

// User -> Moments (一对多)
User.hasMany(Moment, {
  foreignKey: 'user_id',
  as: 'moments'
});
Moment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'author'
});

// User -> Comments (一对多)
User.hasMany(Comment, {
  foreignKey: 'user_id',
  as: 'comments'
});
Comment.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'author'
});

// Moment -> Comments (一对多)
Moment.hasMany(Comment, {
  foreignKey: 'moment_id',
  as: 'comments'
});
Comment.belongsTo(Moment, {
  foreignKey: 'moment_id',
  as: 'moment'
});

// Comment -> Comment (自关联 - 回复)
Comment.belongsTo(Comment, {
  foreignKey: 'reply_to_id',
  as: 'reply_to'
});
Comment.hasMany(Comment, {
  foreignKey: 'reply_to_id',
  as: 'replies'
});

// User -> Likes (一对多)
User.hasMany(Like, {
  foreignKey: 'user_id',
  as: 'likes'
});
Like.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// Follow 关系 (多对多 - 关注/粉丝)
User.belongsToMany(User, {
  through: Follow,
  as: 'following',
  foreignKey: 'follower_id',
  otherKey: 'following_id'
});

User.belongsToMany(User, {
  through: Follow,
  as: 'followers',
  foreignKey: 'following_id',
  otherKey: 'follower_id'
});

// Follow 的直接关联
Follow.belongsTo(User, {
  foreignKey: 'follower_id',
  as: 'follower'
});

Follow.belongsTo(User, {
  foreignKey: 'following_id',
  as: 'following'
});

// Message 关系 (用户之间的消息)
User.hasMany(Message, {
  foreignKey: 'sender_id',
  as: 'sent_messages'
});
User.hasMany(Message, {
  foreignKey: 'receiver_id',
  as: 'received_messages'
});
Message.belongsTo(User, {
  foreignKey: 'sender_id',
  as: 'sender'
});
Message.belongsTo(User, {
  foreignKey: 'receiver_id',
  as: 'receiver'
});

// Bottle 关系
User.hasMany(Bottle, {
  foreignKey: 'sender_uuid',
  sourceKey: 'uuid',
  as: 'sent_bottles'
});
User.hasMany(Bottle, {
  foreignKey: 'receiver_uuid',
  sourceKey: 'uuid',
  as: 'received_bottles'
});

// UserPoints 关系 (一对一)
User.hasOne(UserPoints, {
  foreignKey: 'user_id',
  as: 'points'
});
UserPoints.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// CheckinRecord 关系 (一对多)
User.hasMany(CheckinRecord, {
  foreignKey: 'user_id',
  as: 'checkin_records'
});
CheckinRecord.belongsTo(User, {
  foreignKey: 'user_id',
  as: 'user'
});

// ========== 同步数据库 ==========
export const syncDatabase = async (options = {}) => {
  try {
    await sequelize.sync(options);
    console.log('✅ 数据库模型同步成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库模型同步失败:', error);
    return false;
  }
};

// ========== 导出所有模型 ==========
export {
  sequelize,
  User,
  Moment,
  Comment,
  Like,
  Follow,
  Message,
  Bottle,
  UserPoints,
  CheckinRecord
};

export default {
  sequelize,
  User,
  Moment,
  Comment,
  Like,
  Follow,
  Message,
  Bottle,
  UserPoints,
  CheckinRecord,
  syncDatabase
};
