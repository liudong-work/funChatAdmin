import User from './User.js';
import Bottle from './Bottle.js';
import Moment from './Moment.js';

// 定义模型关联
User.hasMany(Bottle, { foreignKey: 'sender_id', as: 'sentBottles' });
User.hasMany(Bottle, { foreignKey: 'caught_by', as: 'caughtBottles' });
User.hasMany(Moment, { foreignKey: 'user_id', as: 'moments' });

Bottle.belongsTo(User, { foreignKey: 'sender_id', as: 'sender' });
Bottle.belongsTo(User, { foreignKey: 'caught_by', as: 'catcher' });
Moment.belongsTo(User, { foreignKey: 'user_id', as: 'author' });

// 导出所有模型
export {
  User,
  Bottle,
  Moment
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
