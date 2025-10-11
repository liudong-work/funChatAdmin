import sequelize from './src/config/database.js';
import { User, Moment } from './src/models/index.js';
import bcrypt from 'bcryptjs';

async function testReviewWorkflow() {
  try {
    console.log('🔄 开始测试审核工作流程...\n');
    
    // 1. 创建测试用户
    console.log('1️⃣ 创建测试用户...');
    const hashedPassword = await bcrypt.hash('123456', 10);
    
    const user = await User.create({
      uuid: `user_test_${Date.now()}`,
      phone: '13800138888',
      username: '测试用户',
      nickname: '测试用户',
      password: hashedPassword,
      status: 'active'
    });
    console.log('✅ 测试用户创建成功:', user.nickname, user.uuid);
    
    // 2. 创建待审核动态
    console.log('\n2️⃣ 创建待审核动态...');
    const moments = [];
    for (let i = 1; i <= 3; i++) {
      const moment = await Moment.create({
        uuid: `moment_test_${Date.now()}_${i}`,
        user_id: user.id,
        content: `这是测试动态 #${i}，等待审核`,
        images: JSON.stringify([]),
        visibility: 'public',
        status: 'pending',
        likes_count: 0,
        comments_count: 0,
        shares_count: 0
      });
      moments.push(moment);
      console.log(`✅ 动态 ${i} 创建成功:`, moment.uuid, '- 状态:', moment.status);
    }
    
    // 3. 查询待审核动态
    console.log('\n3️⃣ 查询待审核动态...');
    const pendingMoments = await Moment.findAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname']
      }]
    });
    console.log(`✅ 找到 ${pendingMoments.length} 条待审核动态`);
    
    // 4. 审核第一条动态（通过）
    console.log('\n4️⃣ 审核第一条动态（通过）...');
    await moments[0].update({
      status: 'published',
      reviewed_at: new Date(),
      reviewed_by: 1,
      review_comment: '内容符合规范，审核通过'
    });
    console.log('✅ 动态 1 审核通过:', moments[0].uuid);
    
    // 5. 审核第二条动态（拒绝）
    console.log('\n5️⃣ 审核第二条动态（拒绝）...');
    await moments[1].update({
      status: 'rejected',
      reviewed_at: new Date(),
      reviewed_by: 1,
      review_comment: '内容不符合社区规范'
    });
    console.log('✅ 动态 2 审核拒绝:', moments[1].uuid);
    
    // 6. 查询已发布动态
    console.log('\n6️⃣ 查询已发布动态...');
    const publishedMoments = await Moment.findAll({
      where: { status: 'published', visibility: 'public' },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname']
      }]
    });
    console.log(`✅ 找到 ${publishedMoments.length} 条已发布动态`);
    publishedMoments.forEach(m => {
      console.log(`  - ${m.uuid}: "${m.content}" (作者: ${m.author.nickname})`);
    });
    
    // 7. 查询剩余待审核动态
    console.log('\n7️⃣ 查询剩余待审核动态...');
    const remainingPending = await Moment.count({ where: { status: 'pending' } });
    console.log(`✅ 剩余 ${remainingPending} 条待审核动态`);
    
    console.log('\n🎉 测试完成！审核工作流程正常！');
    
    // 关闭数据库连接
    await sequelize.close();
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
}

testReviewWorkflow();
