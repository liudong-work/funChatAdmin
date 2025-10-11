import sequelize from './src/config/database.js';
import { User, Moment, Comment, Like, Follow, Bottle, Message } from './src/models/index.js';

async function syncDatabase() {
  try {
    console.log('🔄 开始同步数据库模型...');
    
    // 强制同步所有模型（会删除并重新创建表）
    await sequelize.sync({ force: true });
    
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
