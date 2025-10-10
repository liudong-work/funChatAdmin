import User from './User.js';
import Bottle from './Bottle.js';
import Moment from './Moment.js';
import Conversation from './Conversation.js';
import Message from './Message.js';

// 定义模型关联
// 用户 - 漂流瓶
User.hasMany(Bottle, { foreignKey: 'sender_uuid', sourceKey: 'uuid', as: 'sentBottles' });
Bottle.belongsTo(User, { foreignKey: 'sender_uuid', targetKey: 'uuid', as: 'sender' });

// 用户 - 动态
User.hasMany(Moment, { foreignKey: 'user_uuid', sourceKey: 'uuid', as: 'moments' });
Moment.belongsTo(User, { foreignKey: 'user_uuid', targetKey: 'uuid', as: 'author' });

// 对话 - 用户
Conversation.belongsTo(User, { foreignKey: 'user1_uuid', targetKey: 'uuid', as: 'user1' });
Conversation.belongsTo(User, { foreignKey: 'user2_uuid', targetKey: 'uuid', as: 'user2' });

// 对话 - 消息
Conversation.hasMany(Message, { foreignKey: 'conversation_uuid', sourceKey: 'uuid', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_uuid', targetKey: 'uuid', as: 'conversation' });

// 消息 - 用户
Message.belongsTo(User, { foreignKey: 'sender_uuid', targetKey: 'uuid', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiver_uuid', targetKey: 'uuid', as: 'receiver' });

// 消息 - 漂流瓶
Message.belongsTo(Bottle, { foreignKey: 'bottle_uuid', targetKey: 'uuid', as: 'bottle' });

// 导出所有模型
export {
  User,
  Bottle,
  Moment,
  Conversation,
  Message
};

// 初始化数据库
export const initDatabase = async () => {
  try {
    const { testConnection, syncDatabase } = await import('../config/database.js');
    
    // 测试连接
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    
    // 同步数据库
    await syncDatabase();
    
    console.log('✅ 数据库初始化成功');
    return true;
  } catch (error) {
    console.error('❌ 数据库初始化失败:', error);
    throw error;
  }
};
