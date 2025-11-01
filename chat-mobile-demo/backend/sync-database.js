import sequelize from './src/config/database.js';
import { User, Moment, Comment, Like, Follow, Bottle, Message, UserPoints, CheckinRecord, Order, MembershipPlan, BottleConfig, Feedback } from './src/models/index.js';

async function syncDatabase() {
  try {
    console.log('🔄 开始同步数据库模型...');
    
    // 使用 alter: true 来安全地添加新表和字段，不删除现有数据
    await sequelize.sync({ alter: true });
    
    console.log('✅ 数据库模型同步成功');
    
    // 关闭连接
    await sequelize.close();
    console.log('🔌 数据库连接已关闭');
    
  } catch (error) {
    console.error('❌ 数据库模型同步失败:', error);
    process.exit(1);
  }
}

syncDatabase();
