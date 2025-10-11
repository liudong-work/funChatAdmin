import { syncDatabase } from './src/models/index.js';
import { testConnection } from './src/config/database.js';

async function initDatabase() {
  console.log('🚀 开始初始化数据库...\n');
  
  // 1. 测试连接
  console.log('📡 步骤 1/2: 测试数据库连接...');
  const connected = await testConnection();
  
  if (!connected) {
    console.error('❌ 数据库连接失败，请检查配置');
    process.exit(1);
  }
  
  console.log('');
  
  // 2. 同步模型
  console.log('📦 步骤 2/2: 同步数据库模型...');
  const synced = await syncDatabase({ alter: true });
  
  if (!synced) {
    console.error('❌ 数据库模型同步失败');
    process.exit(1);
  }
  
  console.log('\n✅ 数据库初始化完成！');
  console.log('\n📊 已创建的表:');
  console.log('   - users (用户表)');
  console.log('   - moments (动态表)');
  console.log('   - comments (评论表)');
  console.log('   - likes (点赞表)');
  console.log('   - follows (关注表)');
  console.log('   - messages (消息表)');
  console.log('   - bottles (漂流瓶表)');
  
  process.exit(0);
}

initDatabase().catch((error) => {
  console.error('❌ 初始化失败:', error);
  process.exit(1);
});

