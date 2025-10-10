import { testConnection } from './src/config/database.js';
import { User, Bottle, Moment, Conversation, Message } from './src/models/index.js';
import { log } from './src/config/logger.js';

async function testDatabase() {
  console.log('🔍 开始测试数据库连接...\n');
  
  try {
    // 1. 测试连接
    console.log('📡 步骤 1: 测试数据库连接');
    const connected = await testConnection();
    if (!connected) {
      throw new Error('数据库连接失败');
    }
    console.log('✅ 数据库连接成功\n');
    
    // 2. 同步模型（不删除数据）
    console.log('🔄 步骤 2: 同步数据模型');
    const sequelize = (await import('./src/config/database.js')).default;
    await sequelize.sync({ alter: true });
    console.log('✅ 数据模型同步成功\n');
    
    // 3. 测试创建用户
    console.log('👤 步骤 3: 测试创建用户');
    const testUser = await User.findOne({ where: { phone: '13800138000' } });
    let user;
    
    if (testUser) {
      user = testUser;
      console.log('   用户已存在:', user.uuid);
    } else {
      user = await User.create({
        phone: '13800138000',
        username: '测试用户',
        status: 'active'
      });
      console.log('   用户创建成功:', user.uuid);
    }
    console.log('✅ 用户测试成功\n');
    
    // 4. 测试创建漂流瓶
    console.log('🍾 步骤 4: 测试创建漂流瓶');
    const bottle = await Bottle.create({
      sender_uuid: user.uuid,
      content: '这是一个测试漂流瓶',
      mood: 'happy',
      status: 'sea'
    });
    console.log('   漂流瓶创建成功:', bottle.uuid);
    console.log('✅ 漂流瓶测试成功\n');
    
    // 5. 测试查询
    console.log('🔍 步骤 5: 测试数据查询');
    const userCount = await User.count();
    const bottleCount = await Bottle.count();
    const momentCount = await Moment.count();
    
    console.log('   数据统计:');
    console.log(`   - 用户数: ${userCount}`);
    console.log(`   - 漂流瓶数: ${bottleCount}`);
    console.log(`   - 动态数: ${momentCount}`);
    console.log('✅ 查询测试成功\n');
    
    // 6. 测试关联查询
    console.log('🔗 步骤 6: 测试关联查询');
    const bottleWithUser = await Bottle.findOne({
      where: { uuid: bottle.uuid },
      include: [{ model: User, as: 'sender' }]
    });
    console.log('   漂流瓶发送者:', bottleWithUser.sender.username);
    console.log('✅ 关联查询测试成功\n');
    
    console.log('🎉 所有测试通过！数据库工作正常！\n');
    console.log('📋 测试总结:');
    console.log('   ✅ 数据库连接正常');
    console.log('   ✅ 表结构同步成功');
    console.log('   ✅ 数据创建功能正常');
    console.log('   ✅ 数据查询功能正常');
    console.log('   ✅ 关联查询功能正常');
    console.log('\n💡 提示: 你可以开始使用数据库版本的服务器了！\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ 测试失败:', error.message);
    console.error('\n💡 可能的原因:');
    console.error('   1. MySQL服务未启动');
    console.error('   2. 数据库 drift_bottle 未创建');
    console.error('   3. 数据库密码配置错误（检查 .env 文件）');
    console.error('   4. 数据库用户权限不足');
    console.error('\n📚 解决方案:');
    console.error('   1. 启动MySQL: brew services start mysql');
    console.error('   2. 创建数据库: mysql -u root -p < init-database.sql');
    console.error('   3. 检查配置: cat .env');
    console.error('\n详细错误信息:');
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
testDatabase();

