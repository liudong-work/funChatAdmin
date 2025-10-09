const express = require('express');
const router = express.Router();
const Moment = require('../models/Moment');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

/**
 * 发布动态
 * POST /api/moments
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, images, location } = req.body;
    const userId = req.user.uuid;

    // 验证内容
    if (!content && (!images || images.length === 0)) {
      return res.status(400).json({
        status: false,
        message: '请输入内容或选择图片'
      });
    }

    // 创建动态
    const moment = await Moment.create({
      user_id: userId,
      content: content || '',
      images: images || [],
      location: location || null,
      status: 'normal'
    });

    // 获取用户信息
    const user = await User.findOne({ where: { uuid: userId } });

    res.json({
      status: true,
      message: '发布成功',
      data: {
        uuid: moment.uuid,
        content: moment.content,
        images: moment.images,
        location: moment.location,
        likesCount: moment.likes_count,
        commentsCount: moment.comments_count,
        createdAt: moment.created_at,
        user: {
          uuid: user.uuid,
          username: user.username,
          avatar: user.avatar
        }
      }
    });
  } catch (error) {
    console.error('发布动态失败:', error);
    res.status(500).json({
      status: false,
      message: '发布失败',
      error: error.message
    });
  }
});

/**
 * 获取动态列表
 * GET /api/moments
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, userId } = req.query;
    
    // 构建查询条件
    const where = { status: 'normal' };
    if (userId) {
      where.user_id = userId;
    }
    
    // 计算分页
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询动态列表
    const { count, rows: moments } = await Moment.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // 获取所有用户信息
    const userIds = [...new Set(moments.map(m => m.user_id))];
    const users = await User.findAll({
      where: { uuid: userIds },
      attributes: ['uuid', 'username', 'avatar']
    });
    
    const userMap = {};
    users.forEach(user => {
      userMap[user.uuid] = {
        uuid: user.uuid,
        username: user.username,
        avatar: user.avatar
      };
    });

    // 组装数据
    const data = moments.map(moment => ({
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images,
      location: moment.location,
      likesCount: moment.likes_count,
      commentsCount: moment.comments_count,
      createdAt: moment.created_at,
      user: userMap[moment.user_id] || null
    }));

    res.json({
      status: true,
      data: {
        list: data,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取动态列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取动态列表失败',
      error: error.message
    });
  }
});

/**
 * 获取动态详情
 * GET /api/moments/:uuid
 */
router.get('/:uuid', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moment = await Moment.findOne({
      where: { uuid, status: 'normal' }
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 获取用户信息
    const user = await User.findOne({
      where: { uuid: moment.user_id },
      attributes: ['uuid', 'username', 'avatar']
    });

    res.json({
      status: true,
      data: {
        uuid: moment.uuid,
        content: moment.content,
        images: moment.images,
        location: moment.location,
        likesCount: moment.likes_count,
        commentsCount: moment.comments_count,
        createdAt: moment.created_at,
        user: user ? {
          uuid: user.uuid,
          username: user.username,
          avatar: user.avatar
        } : null
      }
    });
  } catch (error) {
    console.error('获取动态详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取动态详情失败',
      error: error.message
    });
  }
});

/**
 * 删除动态
 * DELETE /api/moments/:uuid
 */
router.delete('/:uuid', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.uuid;
    
    const moment = await Moment.findOne({
      where: { uuid, user_id: userId }
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在或无权删除'
      });
    }

    // 软删除
    await moment.update({ status: 'deleted' });

    res.json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除动态失败:', error);
    res.status(500).json({
      status: false,
      message: '删除失败',
      error: error.message
    });
  }
});

/**
 * 点赞动态
 * POST /api/moments/:uuid/like
 */
router.post('/:uuid/like', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moment = await Moment.findOne({
      where: { uuid, status: 'normal' }
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 增加点赞数
    await moment.increment('likes_count');
    await moment.reload();

    res.json({
      status: true,
      message: '点赞成功',
      data: {
        likesCount: moment.likes_count
      }
    });
  } catch (error) {
    console.error('点赞失败:', error);
    res.status(500).json({
      status: false,
      message: '点赞失败',
      error: error.message
    });
  }
});

/**
 * 取消点赞
 * DELETE /api/moments/:uuid/like
 */
router.delete('/:uuid/like', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moment = await Moment.findOne({
      where: { uuid, status: 'normal' }
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 减少点赞数
    if (moment.likes_count > 0) {
      await moment.decrement('likes_count');
      await moment.reload();
    }

    res.json({
      status: true,
      message: '取消点赞成功',
      data: {
        likesCount: moment.likes_count
      }
    });
  } catch (error) {
    console.error('取消点赞失败:', error);
    res.status(500).json({
      status: false,
      message: '取消点赞失败',
      error: error.message
    });
  }
});

module.exports = router;

