import express from 'express';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';
import { User, Moment, Comment, Like, Follow } from '../models/index.js';
import pushService from '../services/pushService.js';

const router = express.Router();

// 发布动态
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const { content, images = [], privacy = 'public' } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        status: false,
        message: '动态内容不能为空'
      });
    }

    if (content.length > 500) {
      return res.status(400).json({
        status: false,
        message: '动态内容不能超过500个字符'
      });
    }

    // 查找用户
    const user = await User.findOne({ where: { uuid: req.user.uuid } });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 创建动态
    const moment = await Moment.create({
      uuid: `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      user_id: user.id,
      content: content.trim(),
      images: images,
      visibility: privacy,
      status: 'pending', // 待审核状态
      likes_count: 0,
      comments_count: 0
    });

    log.info(`动态创建成功: ${moment.uuid} (用户: ${user.id})`);

    res.status(201).json({
      status: true,
      message: '动态发布成功',
      data: {
        moment: {
          uuid: moment.uuid,
          content: moment.content,
          images: moment.images,
          privacy: moment.visibility,
          status: moment.status,
          created_at: moment.created_at || moment.createdAt
        }
      }
    });
  } catch (error) {
    log.error('发布动态失败:', error);
    res.status(500).json({
      status: false,
      message: '发布动态失败: ' + error.message
    });
  }
});

// 获取动态列表
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10,
      type = 'latest', // latest(最新) / following(关注)
      status = 'published', // 动态状态
      privacy = 'public' // 动态可见性
    } = req.query;
    
    const current_user_uuid = req.user.uuid;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 查找当前用户
    const currentUser = await User.findOne({ where: { uuid: current_user_uuid } });
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 构建查询条件
    let whereCondition = {
      status: status,
      visibility: privacy
    };
    
    log.info('[动态列表] 查询参数:', { status, privacy, type, page, pageSize });
    log.info('[动态列表] 查询条件:', whereCondition);

    // 如果是关注动态，需要获取关注的用户ID列表
    if (type === 'following') {
      const followings = await Follow.findAll({
        where: {
          follower_id: currentUser.id,
          status: 'active'
        },
        attributes: ['following_id']
      });

      const followingIds = followings.map(f => f.following_id);
      followingIds.push(currentUser.id); // 包含自己的动态

      whereCondition.user_id = {
        [Op.in]: followingIds
      };
    }

    // 查询动态列表
    const { count, rows: moments } = await Moment.findAndCountAll({
      where: whereCondition,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });
    
    log.info('[动态列表] 查询结果:', { count, momentsCount: moments.length });

    // 获取当前用户的点赞记录
    const momentIds = moments.map(m => m.id);
    const userLikes = await Like.findAll({
      where: {
        user_id: currentUser.id,
        target_type: 'moment',
        target_id: {
          [Op.in]: momentIds
        }
      },
      attributes: ['target_id']
    });

    const likedMomentIds = new Set(userLikes.map(like => like.target_id));

    // 格式化数据
    const formattedMoments = moments.map(moment => {
      // 处理images字段，确保是数组
      let images = [];
      if (moment.images) {
        if (typeof moment.images === 'string') {
          try {
            images = JSON.parse(moment.images);
          } catch (e) {
            images = [];
          }
        } else if (Array.isArray(moment.images)) {
          images = moment.images;
        }
      }

      return {
        id: moment.uuid,
        uuid: moment.uuid,
        content: moment.content,
        images: images,
        privacy: moment.visibility,
        status: moment.status,
        likes_count: moment.likes_count,
        comments_count: moment.comments_count,
        is_liked: likedMomentIds.has(moment.id),
        created_at: moment.created_at || moment.createdAt,
        updated_at: moment.updated_at || moment.updatedAt,
        author: moment.author ? {
          id: moment.author.id,
          uuid: moment.author.uuid,
          phone: moment.author.phone,
          username: moment.author.username || moment.author.phone,
          nickname: moment.author.nickname || moment.author.username,
          avatar: moment.author.avatar || '👤'
        } : {
          // 作者数据缺失的情况（理论上不应该发生）
          id: 0,
          uuid: 'unknown',
          phone: '',
          username: '匿名用户',
          nickname: '匿名用户',
          avatar: '👤'
        }
      };
    });

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize))
      }
    });
  } catch (error) {
    log.error('获取动态列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取动态列表失败: ' + error.message
    });
  }
});

// 获取动态详情
router.get('/:moment_uuid', authenticateToken, async (req, res) => {
  try {
    const { moment_uuid } = req.params;
    const current_user_uuid = req.user.uuid;

    // 查找当前用户
    const currentUser = await User.findOne({ where: { uuid: current_user_uuid } });
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 查找动态
    const moment = await Moment.findOne({
      where: { uuid: moment_uuid },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar']
      }]
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 检查是否点赞
    const like = await Like.findOne({
      where: {
        user_id: currentUser.id,
        target_type: 'moment',
        target_id: moment.id
      }
    });

    // 获取评论列表
    const comments = await Comment.findAll({
      where: {
        moment_id: moment.id,
        status: 'published'
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar']
      }],
      order: [['created_at', 'DESC']]
    });

    const formattedComments = comments.map(comment => ({
      id: comment.uuid,
      uuid: comment.uuid,
      content: comment.content,
      likes_count: comment.likes_count,
      created_at: comment.created_at || comment.createdAt,
      author: comment.author ? {
        id: comment.author.id,
        uuid: comment.author.uuid,
        phone: comment.author.phone,
        username: comment.author.username || comment.author.phone,
        nickname: comment.author.nickname || comment.author.username,
        avatar: comment.author.avatar || '👤'
      } : {
        id: 0,
        uuid: 'unknown',
        phone: '',
        username: '匿名用户',
        nickname: '匿名用户',
        avatar: '👤'
      }
    }));

    res.json({
      status: true,
      data: {
        moment: {
          id: moment.uuid,
          uuid: moment.uuid,
          content: moment.content,
          images: moment.images || [],
          privacy: moment.visibility,
          status: moment.status,
          likes_count: moment.likes_count,
          comments_count: moment.comments_count,
          is_liked: !!like,
          created_at: moment.created_at || moment.createdAt,
          updated_at: moment.updated_at || moment.updatedAt,
          author: moment.author ? {
            id: moment.author.id,
            uuid: moment.author.uuid,
            phone: moment.author.phone,
            username: moment.author.username || moment.author.phone,
            nickname: moment.author.nickname || moment.author.username,
            avatar: moment.author.avatar || '👤'
          } : {
            id: 0,
            uuid: 'unknown',
            phone: '',
            username: '匿名用户',
            nickname: '匿名用户',
            avatar: '👤'
          },
          comments: formattedComments
        }
      }
    });
  } catch (error) {
    log.error('获取动态详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取动态详情失败: ' + error.message
    });
  }
});

// 点赞/取消点赞动态
router.post('/:moment_uuid/like', authenticateToken, async (req, res) => {
  try {
    const { moment_uuid } = req.params;
    const current_user_uuid = req.user.uuid;

    // 查找当前用户
    const currentUser = await User.findOne({ where: { uuid: current_user_uuid } });
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 查找动态
    const moment = await Moment.findOne({ where: { uuid: moment_uuid } });
    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 检查是否已点赞
    const existingLike = await Like.findOne({
      where: {
        user_id: currentUser.id,
        target_type: 'moment',
        target_id: moment.id
      }
    });

    if (existingLike) {
      // 已点赞，取消点赞
      await existingLike.destroy();
      await moment.decrement('likes_count');

      log.info(`取消点赞动态: ${moment_uuid} (用户: ${currentUser.id})`);

      return res.json({
        status: true,
        message: '已取消点赞',
        data: {
          is_liked: false,
          likes_count: moment.likes_count - 1
        }
      });
    } else {
      // 未点赞，添加点赞
      await Like.create({
        user_id: currentUser.id,
        target_type: 'moment',
        target_id: moment.id
      });
      await moment.increment('likes_count');

      log.info(`点赞动态: ${moment_uuid} (用户: ${currentUser.id})`);

      // 发送推送通知给动态作者（如果不是自己点赞自己）
      if (moment.user_id !== currentUser.id) {
        try {
          const author = await User.findByPk(moment.user_id);
          if (author) {
            await pushService.sendLikeNotification(
              author.uuid,
              currentUser.nickname || currentUser.phone,
              currentUser.uuid,
              moment_uuid,
              moment.content
            );
            log.info(`[推送] 已向动态作者 ${author.uuid} 发送点赞推送`);
          }
        } catch (pushError) {
          log.error('[推送] 发送点赞推送失败:', pushError);
        }
      }

      return res.json({
        status: true,
        message: '点赞成功',
        data: {
          is_liked: true,
          likes_count: moment.likes_count + 1
        }
      });
    }
  } catch (error) {
    log.error('点赞操作失败:', error);
    res.status(500).json({
      status: false,
      message: '操作失败: ' + error.message
    });
  }
});

// 评论动态
router.post('/:moment_uuid/comment', authenticateToken, async (req, res) => {
  try {
    const { moment_uuid } = req.params;
    const { content, reply_to_id } = req.body;
    const current_user_uuid = req.user.uuid;

    if (!content || !content.trim()) {
      return res.status(400).json({
        status: false,
        message: '评论内容不能为空'
      });
    }

    // 查找当前用户
    const currentUser = await User.findOne({ where: { uuid: current_user_uuid } });
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 查找动态
    const moment = await Moment.findOne({ where: { uuid: moment_uuid } });
    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 创建评论
    const comment = await Comment.create({
      uuid: `comment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      moment_id: moment.id,
      user_id: currentUser.id,
      content: content.trim(),
      reply_to_id: reply_to_id || null,
      status: 'published'
    });

    // 更新动态评论数
    await moment.increment('comments_count');

    log.info(`评论动态: ${moment_uuid} (用户: ${currentUser.id})`);

    // 发送推送通知给动态作者（如果不是自己评论自己）
    if (moment.user_id !== currentUser.id) {
      try {
        const author = await User.findByPk(moment.user_id);
        if (author) {
          await pushService.sendCommentNotification(
            author.uuid,
            currentUser.nickname || currentUser.phone,
            currentUser.uuid,
            moment_uuid,
            content.trim()
          );
          log.info(`[推送] 已向动态作者 ${author.uuid} 发送评论推送`);
        }
      } catch (pushError) {
        log.error('[推送] 发送评论推送失败:', pushError);
      }
    }

    res.status(201).json({
      status: true,
      message: '评论成功',
      data: {
        comment: {
          id: comment.uuid,
          uuid: comment.uuid,
          content: comment.content,
          created_at: comment.created_at || comment.createdAt,
          author: {
            id: currentUser.id,
            uuid: currentUser.uuid,
            phone: currentUser.phone,
            username: currentUser.username || currentUser.phone,
            nickname: currentUser.nickname || currentUser.username,
            avatar: currentUser.avatar || '👤'
          }
        }
      }
    });
  } catch (error) {
    log.error('评论失败:', error);
    res.status(500).json({
      status: false,
      message: '评论失败: ' + error.message
    });
  }
});

// 获取动态评论列表
router.get('/:moment_uuid/comments', authenticateToken, async (req, res) => {
  try {
    const { moment_uuid } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 查找动态
    const moment = await Moment.findOne({
      where: { uuid: moment_uuid }
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 获取评论列表
    const { count, rows: comments } = await Comment.findAndCountAll({
      where: {
        moment_id: moment.id,
        status: 'published'
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    const formattedComments = comments.map(comment => ({
      id: comment.uuid,
      uuid: comment.uuid,
      content: comment.content,
      created_at: comment.created_at || comment.createdAt,
      author: comment.author ? {
        id: comment.author.id,
        uuid: comment.author.uuid,
        username: comment.author.username || comment.author.phone,
        nickname: comment.author.nickname || comment.author.username,
        avatar: comment.author.avatar || '👤'
      } : {
        id: 0,
        uuid: 'unknown',
        username: '匿名用户',
        nickname: '匿名用户',
        avatar: '👤'
      }
    }));

    res.json({
      status: true,
      data: {
        list: formattedComments,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    log.error('获取评论列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取评论列表失败'
    });
  }
});

// 获取用户动态列表
router.get('/user/:user_uuid', authenticateToken, async (req, res) => {
  try {
    const { user_uuid } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 查找用户
    const user = await User.findOne({ where: { uuid: user_uuid } });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 查询用户的动态
    const { count, rows: moments } = await Moment.findAndCountAll({
      where: {
        user_id: user.id,
        status: 'published'
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      limit,
      offset
    });

    // 格式化数据
    const formattedMoments = moments.map(moment => ({
      id: moment.uuid,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images || [],
      privacy: moment.visibility,
      status: moment.status,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      created_at: moment.created_at || moment.createdAt,
      author: moment.author ? {
        id: moment.author.id,
        uuid: moment.author.uuid,
        phone: moment.author.phone,
        username: moment.author.username || moment.author.phone,
        nickname: moment.author.nickname || moment.author.username,
        avatar: moment.author.avatar || '👤'
      } : {
        id: 0,
        uuid: 'unknown',
        phone: '',
        username: '匿名用户',
        nickname: '匿名用户',
        avatar: '👤'
      }
    }));

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(count / parseInt(pageSize))
      }
    });
  } catch (error) {
    log.error('获取用户动态失败:', error);
    res.status(500).json({
      status: false,
      message: '获取失败: ' + error.message
    });
  }
});

export default router;

