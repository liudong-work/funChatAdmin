import { User, Moment, Comment, Like, Follow, Message } from './src/models/index.js';
import { testConnection } from './src/config/database.js';

async function viewData() {
  console.log('📊 数据库数据查看工具\n');
  
  // 测试连接
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ 数据库连接失败');
    process.exit(1);
  }
  
  console.log('');

  try {
    // 1. 查看用户数据
    console.log('👥 用户数据:');
    console.log('='.repeat(80));
    const users = await User.findAll({
      attributes: ['id', 'uuid', 'phone', 'nickname', 'avatar', 'status', 'created_at'],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    if (users.length === 0) {
      console.log('  暂无用户数据');
    } else {
      users.forEach(user => {
        console.log(`  ID: ${user.id} | UUID: ${user.uuid}`);
        console.log(`  手机: ${user.phone} | 昵称: ${user.nickname}`);
        console.log(`  头像: ${user.avatar} | 状态: ${user.status}`);
        console.log(`  创建时间: ${user.created_at}`);
        console.log('  ' + '-'.repeat(76));
      });
      console.log(`  总计: ${users.length} 个用户\n`);
    }

    // 2. 查看动态数据
    console.log('📝 动态数据:');
    console.log('='.repeat(80));
    const moments = await Moment.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['nickname', 'phone']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    if (moments.length === 0) {
      console.log('  暂无动态数据');
    } else {
      moments.forEach(moment => {
        console.log(`  动态ID: ${moment.uuid}`);
        console.log(`  作者: ${moment.author?.nickname || '未知'} (${moment.author?.phone || ''})`);
        console.log(`  内容: ${moment.content.substring(0, 50)}${moment.content.length > 50 ? '...' : ''}`);
        console.log(`  点赞: ${moment.likes_count} | 评论: ${moment.comments_count}`);
        console.log(`  状态: ${moment.status} | 可见性: ${moment.visibility}`);
        console.log(`  创建时间: ${moment.created_at}`);
        console.log('  ' + '-'.repeat(76));
      });
      console.log(`  总计: ${moments.length} 条动态\n`);
    }

    // 3. 查看评论数据
    console.log('💬 评论数据:');
    console.log('='.repeat(80));
    const comments = await Comment.findAll({
      include: [{
        model: User,
        as: 'author',
        attributes: ['nickname', 'phone']
      }],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    if (comments.length === 0) {
      console.log('  暂无评论数据');
    } else {
      comments.forEach(comment => {
        console.log(`  评论ID: ${comment.uuid}`);
        console.log(`  作者: ${comment.author?.nickname || '未知'}`);
        console.log(`  内容: ${comment.content}`);
        console.log(`  创建时间: ${comment.created_at}`);
        console.log('  ' + '-'.repeat(76));
      });
      console.log(`  总计: ${comments.length} 条评论\n`);
    }

    // 4. 查看关注关系
    console.log('👫 关注关系:');
    console.log('='.repeat(80));
    const follows = await Follow.findAll({
      where: { status: 'active' },
      include: [
        {
          model: User,
          as: 'follower',
          attributes: ['nickname', 'phone']
        },
        {
          model: User,
          as: 'following',
          attributes: ['nickname', 'phone']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    if (follows.length === 0) {
      console.log('  暂无关注关系');
    } else {
      follows.forEach(follow => {
        console.log(`  ${follow.follower?.nickname || '未知'} 关注了 ${follow.following?.nickname || '未知'}`);
        console.log(`  创建时间: ${follow.created_at}`);
        console.log('  ' + '-'.repeat(76));
      });
      console.log(`  总计: ${follows.length} 个关注关系\n`);
    }

    // 5. 查看消息数据
    console.log('💌 消息数据:');
    console.log('='.repeat(80));
    const messages = await Message.findAll({
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['nickname', 'phone']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['nickname', 'phone']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 10
    });
    
    if (messages.length === 0) {
      console.log('  暂无消息数据');
    } else {
      messages.forEach(message => {
        console.log(`  消息ID: ${message.uuid}`);
        console.log(`  发送者: ${message.sender?.nickname || '未知'} → 接收者: ${message.receiver?.nickname || '未知'}`);
        console.log(`  内容: ${message.content || '[文件消息]'}`);
        console.log(`  状态: ${message.status} | 已读: ${message.is_read ? '是' : '否'}`);
        console.log(`  创建时间: ${message.created_at}`);
        console.log('  ' + '-'.repeat(76));
      });
      console.log(`  总计: ${messages.length} 条消息\n`);
    }

    // 6. 统计信息
    console.log('📈 统计信息:');
    console.log('='.repeat(80));
    const [userCount, momentCount, commentCount, likeCount, followCount, messageCount] = await Promise.all([
      User.count(),
      Moment.count(),
      Comment.count(),
      Like.count(),
      Follow.count({ where: { status: 'active' } }),
      Message.count()
    ]);

    console.log(`  用户总数: ${userCount}`);
    console.log(`  动态总数: ${momentCount}`);
    console.log(`  评论总数: ${commentCount}`);
    console.log(`  点赞总数: ${likeCount}`);
    console.log(`  关注关系: ${followCount}`);
    console.log(`  消息总数: ${messageCount}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ 查询数据失败:', error);
  }

  process.exit(0);
}

viewData();

