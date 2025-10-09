import express from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';
import { getMoments } from './moment.js';

const router = express.Router();

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: false, message: '访问令牌无效' });
  }

  try {
    // 验证JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
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
    const { page = 1, pageSize = 10 } = req.query;
    const moments = getMoments();
    
    // 筛选待审核的动态
    const pendingMoments = Array.from(moments.values())
      .filter(moment => moment.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedMoments = pendingMoments.slice(startIndex, endIndex);

    // 格式化数据
    const formattedMoments = paginatedMoments.map(moment => ({
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images,
      privacy: moment.privacy,
      status: moment.status,
      user_id: moment.user_id,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      author: {
        id: moment.user_id,
        username: moment.user_phone || `用户${moment.user_id}`,
        nickname: moment.user_phone || `用户${moment.user_id}`,
        phone: `138****${moment.user_id.toString().slice(-4)}`
      }
    }));

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: pendingMoments.length,
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
    const moments = getMoments();
    
    let allMoments = Array.from(moments.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 状态筛选
    if (status && status !== 'all') {
      allMoments = allMoments.filter(moment => moment.status === status);
    }

    // 日期筛选
    if (startDate) {
      allMoments = allMoments.filter(moment => 
        new Date(moment.created_at) >= new Date(startDate)
      );
    }
    if (endDate) {
      allMoments = allMoments.filter(moment => 
        new Date(moment.created_at) <= new Date(endDate)
      );
    }

    // 分页
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedMoments = allMoments.slice(startIndex, endIndex);

    // 格式化数据
    const formattedMoments = paginatedMoments.map(moment => ({
      id: moment.id,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images,
      privacy: moment.privacy,
      status: moment.status,
      user_id: moment.user_id,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      reviewed_at: moment.reviewed_at,
      reviewed_by: moment.reviewed_by,
      review_comment: moment.review_comment,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      author: {
        id: moment.user_id,
        username: moment.user_phone || `用户${moment.user_id}`,
        nickname: moment.user_phone || `用户${moment.user_id}`,
        phone: `138****${moment.user_id.toString().slice(-4)}`
      }
    }));

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: allMoments.length,
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

    console.log('[审核] 收到审核请求:', { uuid, status, reviewComment, reviewerId });

    if (!status || !['approved', 'rejected'].includes(status)) {
      console.log('[审核] 审核状态无效:', status);
      return res.status(400).json({
        status: false,
        message: '审核状态无效'
      });
    }

    const moments = getMoments();
    console.log('[审核] 获取动态存储，大小:', moments.size);
    console.log('[审核] 查找动态UUID:', uuid);
    
    const moment = moments.get(uuid);
    console.log('[审核] 找到动态:', moment ? '是' : '否');

    if (!moment) {
      console.log('[审核] 动态不存在');
      return res.status(404).json({
        status: false,
        message: '动态不存在'
      });
    }

    // 更新审核状态
    moment.status = status;
    moment.reviewed_at = new Date();
    moment.reviewed_by = reviewerId;
    moment.review_comment = reviewComment || '';
    moment.updated_at = new Date();

    moments.set(uuid, moment);

    log.info(`动态审核完成: ${uuid}, 状态: ${status}, 审核人: ${reviewerId}`);

    res.json({
      status: true,
      message: `动态${status === 'approved' ? '审核通过' : '审核拒绝'}`,
      data: {
        uuid,
        status,
        reviewComment,
        reviewed_at: moment.reviewed_at,
        reviewed_by: reviewerId
      }
    });
  } catch (error) {
    console.error('[审核] 审核动态失败:', error);
    log.error('审核动态失败:', error);
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
    const moments = getMoments();
    const moment = moments.get(uuid);

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
      images: moment.images,
      privacy: moment.privacy,
      status: moment.status,
      user_id: moment.user_id,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      reviewed_at: moment.reviewed_at,
      reviewed_by: moment.reviewed_by,
      review_comment: moment.review_comment,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      author: {
        id: moment.user_id,
        username: moment.user_phone || `用户${moment.user_id}`,
        nickname: moment.user_phone || `用户${moment.user_id}`,
        phone: `138****${moment.user_id.toString().slice(-4)}`
      }
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
    const moments = getMoments();
    const allMoments = Array.from(moments.values());

    const stats = {
      total: allMoments.length,
      pending: allMoments.filter(m => m.status === 'pending').length,
      approved: allMoments.filter(m => m.status === 'approved').length,
      rejected: allMoments.filter(m => m.status === 'rejected').length,
      today: allMoments.filter(m => {
        const today = new Date();
        const momentDate = new Date(m.created_at);
        return momentDate.toDateString() === today.toDateString();
      }).length,
      thisWeek: allMoments.filter(m => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(m.created_at) >= weekAgo;
      }).length
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