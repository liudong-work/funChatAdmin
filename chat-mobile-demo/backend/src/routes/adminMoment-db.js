import express from 'express';
import jwt from 'jsonwebtoken';
import { Op } from 'sequelize';
import { log } from '../config/logger.js';
import { config } from '../config/config.js';
import { Moment, User } from '../models/index.js';

const router = express.Router();

// 状态映射函数：将英文状态转换为中文显示
const getStatusText = (status) => {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝',
    'published': '已发布',
    'draft': '草稿',
    'deleted': '已删除'
  };
  return statusMap[status] || status;
};

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: false, message: '访问令牌无效' });
  }

  try {
    // 验证JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 检查是否是管理员token
    if (decoded.type === 'admin') {
      req.admin = { id: decoded.id, username: decoded.username };
      next();
    } else {
      return res.status(403).json({ status: false, message: '管理员权限不足' });
    }
  } catch (error) {
    // 兼容旧的admin_token
    if (token === 'admin_token') {
      req.admin = { id: 1, username: 'admin' };
      next();
    } else {
      return res.status(403).json({ status: false, message: '访问令牌无效或已过期' });
    }
  }
};

// 获取待审核动态列表
router.get('/pending', adminAuth, async (req, res) => {
  try {
    log.info('[管理] 查询待审核动态列表...');
    const { page = 1, pageSize = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 查询待审核的动态
    log.info('[管理] 数据库查询参数:', { page, pageSize, offset, limit });
    const { count, rows } = await Moment.findAndCountAll({
      where: { status: 'pending' },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname', 'phone', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // 格式化数据
    const formattedMoments = rows.map(moment => ({
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images ? (typeof moment.images === 'string' ? JSON.parse(moment.images) : moment.images) : [],
      privacy: moment.visibility,
      status: moment.status,
      statusText: getStatusText(moment.status),
      user_id: moment.user_id,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      author: moment.author ? {
        id: moment.author.id,
        uuid: moment.author.uuid,
        username: moment.author.nickname || moment.author.phone,
        nickname: moment.author.nickname,
        phone: moment.author.phone,
        avatar: moment.author.avatar
      } : null
    }));

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    log.error('获取待审核动态失败:', error);
    res.status(500).json({ status: false, message: '获取待审核动态失败' });
  }
});

// 获取所有动态列表（包含已审核的）
router.get('/all', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, status, startDate, endDate } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    // 构建查询条件
    let whereCondition = {};
    
    if (status && status !== 'all') {
      whereCondition.status = status;
    }

    if (startDate) {
      whereCondition.created_at = {
        [Op.gte]: new Date(startDate)
      };
    }
    
    if (endDate) {
      whereCondition.created_at = {
        ...whereCondition.created_at,
        [Op.lte]: new Date(endDate)
      };
    }

    // 查询动态
    const { count, rows } = await Moment.findAndCountAll({
      where: whereCondition,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname', 'phone', 'avatar']
      }],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    // 格式化数据
    const formattedMoments = rows.map(moment => {
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
        id: moment.id,
        uuid: moment.uuid,
        content: moment.content,
        images: images,
        privacy: moment.visibility,
        status: moment.status,
        statusText: getStatusText(moment.status),
        user_id: moment.user_id,
        created_at: moment.createdAt,
        updated_at: moment.updatedAt,
        reviewed_at: moment.reviewed_at,
        reviewed_by: moment.reviewed_by,
        review_comment: moment.review_comment,
        likes_count: moment.likes_count,
        comments_count: moment.comments_count,
        author: moment.author ? {
          id: moment.author.id,
          uuid: moment.author.uuid,
          username: moment.author.nickname || moment.author.phone,
          nickname: moment.author.nickname,
          phone: moment.author.phone,
          avatar: moment.author.avatar
        } : null
      };
    });

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    log.error('获取所有动态失败:', error);
    res.status(500).json({ status: false, message: '获取所有动态失败' });
  }
});

// 审核动态
router.post('/review/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status, reviewComment } = req.body;
    const reviewerId = req.admin.id;

    log.info('[审核] 收到审核请求:', { uuid, status, reviewComment, reviewerId });

    if (!status || !['approved', 'rejected', 'published'].includes(status)) {
      log.warn('[审核] 审核状态无效:', status);
      return res.status(400).json({
        status: false,
        message: '审核状态无效'
      });
    }

    // 将approved状态转换为published，保持前端查询一致性
    const finalStatus = status === 'approved' ? 'published' : status;

    // 查找动态
    const moment = await Moment.findOne({
      where: { uuid },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname', 'phone']
      }]
    });

    if (!moment) {
      log.warn('[审核] 动态不存在:', uuid);
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 更新审核状态
    // 将管理员ID转换为整数，如果是admin_001则使用1，否则使用默认值
    const adminId = reviewerId === 'admin_001' ? 1 : parseInt(reviewerId) || 1;
    
    await moment.update({
      status: finalStatus,
      reviewed_at: new Date(),
      reviewed_by: adminId,
      review_comment: reviewComment || ''
    });

    log.info(`动态审核完成: ${uuid}, 状态: ${status}, 审核人: ${reviewerId}`);

    res.json({
      status: true,
      message: `动态${status === 'approved' || status === 'published' ? '审核通过' : '审核拒绝'}`,
      data: {
        uuid,
        status,
        reviewComment,
        reviewed_at: moment.reviewed_at,
        reviewed_by: reviewerId
      }
    });
  } catch (error) {
    log.error('[审核] 审核动态失败:', error);
    res.status(500).json({ 
      status: false, 
      message: '审核动态失败',
      error: error.message 
    });
  }
});

// 获取动态详情
router.get('/detail/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moment = await Moment.findOne({
      where: { uuid },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'uuid', 'nickname', 'phone', 'avatar']
      }]
    });

    if (!moment) {
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    const formattedMoment = {
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images ? (typeof moment.images === 'string' ? JSON.parse(moment.images) : moment.images) : [],
      privacy: moment.visibility,
      status: moment.status,
      statusText: getStatusText(moment.status),
      user_id: moment.user_id,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      reviewed_at: moment.reviewed_at,
      reviewed_by: moment.reviewed_by,
      review_comment: moment.review_comment,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      author: moment.author ? {
        id: moment.author.id,
        uuid: moment.author.uuid,
        username: moment.author.nickname || moment.author.phone,
        nickname: moment.author.nickname,
        phone: moment.author.phone,
        avatar: moment.author.avatar
      } : null
    };

    res.json({
      status: true,
      data: formattedMoment
    });
  } catch (error) {
    log.error('获取动态详情失败:', error);
    res.status(500).json({ status: false, message: '获取动态详情失败' });
  }
});

// 获取审核统计
router.get('/statistics', adminAuth, async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [total, pending, approved, rejected, todayCount, weekCount] = await Promise.all([
      Moment.count(),
      Moment.count({ where: { status: 'pending' } }),
      Moment.count({ where: { status: 'approved' } }),
      Moment.count({ where: { status: 'rejected' } }),
      Moment.count({ 
        where: { 
          created_at: { [Op.gte]: today }
        } 
      }),
      Moment.count({ 
        where: { 
          created_at: { [Op.gte]: weekAgo }
        } 
      })
    ]);

    const stats = {
      total,
      pending,
      approved,
      rejected,
      today: todayCount,
      thisWeek: weekCount
    };

    res.json({
      status: true,
      data: stats
    });
  } catch (error) {
    log.error('获取审核统计失败:', error);
    res.status(500).json({ status: false, message: '获取审核统计失败' });
  }
});

export default router;
