import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';

// 内存存储动态数据
const moments = new Map();

// 导出动态数据供管理员使用
export const getMoments = () => moments;

const router = express.Router();

// 发布动态
router.post('/publish', authenticateToken, async (req, res) => {
  try {
    const { content, images = [], privacy = 'public' } = req.body;
    const user_id = req.user.id;

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

    // 生成唯一UUID
    const uuid = `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // 创建动态对象
    const moment = {
      id: Date.now(),
      uuid,
      user_id,
      user_phone: req.user.phone, // 添加用户手机号
      user_uuid: req.user.uuid,   // 添加用户UUID
      content: content.trim(),
      images,
      privacy,
      status: 'pending', // 默认待审核状态
      likes_count: 0,
      comments_count: 0,
      created_at: new Date(),
      updated_at: new Date(),
      reviewed_at: null,
      reviewed_by: null,
      review_comment: null
    };

    // 存储到内存
    moments.set(uuid, moment);

    log.info(`动态创建成功: ${uuid} (用户: ${user_id})`);

    res.status(201).json({
      status: true,
      message: '动态发布成功，等待审核',
      data: {
        moment: {
          uuid: moment.uuid,
          content: moment.content,
          images: moment.images,
          privacy: moment.privacy,
          status: moment.status,
          created_at: moment.created_at
        }
      }
    });
  } catch (error) {
    log.error('发布动态失败:', error);
    res.status(500).json({
      status: false,
      message: '发布动态失败'
    });
  }
});

// 获取动态列表
router.get('/list', async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10, 
      status = 'approved', // 默认只显示已审核的动态
      privacy = 'public'   // 默认只显示公开动态
    } = req.query;

    // 从内存中获取动态数据
    const allMoments = Array.from(moments.values())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // 状态筛选
    let filteredMoments = allMoments;
    if (status && status !== 'all') {
      filteredMoments = filteredMoments.filter(moment => moment.status === status);
    }

    // 隐私筛选
    if (privacy && privacy !== 'all') {
      filteredMoments = filteredMoments.filter(moment => moment.privacy === privacy);
    }

    // 分页
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedMoments = filteredMoments.slice(startIndex, endIndex);

    // 格式化数据供前端使用
    const formattedMoments = paginatedMoments.map(moment => ({
      id: moment.uuid,
      uuid: moment.uuid,
      content: moment.content,
      images: moment.images,
      privacy: moment.privacy,
      status: moment.status,
      likes_count: moment.likes_count,
      comments_count: moment.comments_count,
      created_at: moment.created_at,
      updated_at: moment.updated_at,
      author: {
        id: moment.user_id,
        phone: moment.user_phone,
        username: moment.user_phone || `用户${moment.user_id}`,
        nickname: moment.user_phone || `用户${moment.user_id}`,
        avatar: '👤' // 默认头像
      }
    }));

    res.json({
      status: true,
      data: {
        list: formattedMoments,
        total: filteredMoments.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(filteredMoments.length / parseInt(pageSize))
      }
    });
  } catch (error) {
    log.error('获取动态列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取动态列表失败'
    });
  }
});

// 获取用户自己的动态列表
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const { 
      page = 1, 
      pageSize = 10,
      status 
    } = req.query;
    const user_id = req.user.id;

    const options = {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      user_id
    };

    if (status) options.status = status;

    const result = await momentService.getMoments(options);

    res.json({
      status: true,
      data: result
    });
  } catch (error) {
    log.error('获取我的动态列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取我的动态列表失败'
    });
  }
});

// 获取动态详情
router.get('/detail/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;
    
    const moment = await momentService.getMomentByUuid(uuid);

    res.json({
      status: true,
      data: { moment }
    });
  } catch (error) {
    log.error('获取动态详情失败:', error);
    res.status(500).json({
      status: false,
      message: error.message || '获取动态详情失败'
    });
  }
});

// 点赞动态
router.post('/like/:uuid', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    const user_id = req.user.id;

    const result = await momentService.likeMoment(uuid, user_id);

    res.json({
      status: true,
      message: '点赞成功',
      data: result
    });
  } catch (error) {
    log.error('点赞动态失败:', error);
    res.status(500).json({
      status: false,
      message: error.message || '点赞失败'
    });
  }
});

// 删除动态
router.delete('/:uuid', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    const user_id = req.user.id;

    await momentService.deleteMoment(uuid, user_id);

    res.json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    log.error('删除动态失败:', error);
    res.status(500).json({
      status: false,
      message: error.message || '删除失败'
    });
  }
});

export default router;
