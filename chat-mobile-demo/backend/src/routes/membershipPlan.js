import express from 'express';
import jwt from 'jsonwebtoken';
import { log } from '../config/logger.js';
import { config } from '../config/config.js';
import { MembershipPlan } from '../models/index.js';
import { Op } from 'sequelize';

const router = express.Router();

// 管理员认证中间件（与现有adminMoment-db.js保持一致）
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

// 获取所有会员套餐（公开接口，用于前端显示）
router.get('/public', async (req, res) => {
  try {
    const plans = await MembershipPlan.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'DESC'], ['created_at', 'ASC']],
      attributes: ['id', 'name', 'type', 'price', 'originalPrice', 'duration', 'durationText', 'features', 'isPopular', 'description']
    });

    res.json({
      status: true,
      message: '获取会员套餐成功',
      data: plans
    });
  } catch (error) {
    log.error('获取会员套餐失败:', error);
    res.status(500).json({
      status: false,
      message: '获取会员套餐失败',
      error: error.message
    });
  }
});

// 获取所有会员套餐（管理接口）
router.get('/', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, isActive } = req.query;
    const offset = (page - 1) * pageSize;
    
    const where = {};
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const { count, rows } = await MembershipPlan.findAndCountAll({
      where,
      order: [['sortOrder', 'DESC'], ['created_at', 'ASC']],
      limit: parseInt(pageSize),
      offset: parseInt(offset)
    });

    res.json({
      status: true,
      message: '获取会员套餐列表成功',
      data: {
        plans: rows,
        pagination: {
          total: count,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          totalPages: Math.ceil(count / pageSize)
        }
      }
    });
  } catch (error) {
    log.error('获取会员套餐列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取会员套餐列表失败',
      error: error.message
    });
  }
});

// 获取单个会员套餐详情
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await MembershipPlan.findByPk(id);

    if (!plan) {
      return res.status(404).json({
        status: false,
        message: '会员套餐不存在'
      });
    }

    res.json({
      status: true,
      message: '获取会员套餐详情成功',
      data: plan
    });
  } catch (error) {
    log.error('获取会员套餐详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取会员套餐详情失败',
      error: error.message
    });
  }
});

// 创建会员套餐
router.post('/', adminAuth, async (req, res) => {
  try {
    const {
      name,
      type,
      price,
      originalPrice,
      duration,
      durationText,
      features,
      isPopular,
      isActive,
      sortOrder,
      description
    } = req.body;

    // 验证必填字段
    if (!name || !type || !price || !duration || !durationText) {
      return res.status(400).json({
        status: false,
        message: '缺少必填字段：name, type, price, duration, durationText'
      });
    }

    // 检查类型是否已存在
    const existingPlan = await MembershipPlan.findOne({
      where: { type }
    });

    if (existingPlan) {
      return res.status(400).json({
        status: false,
        message: '该类型的会员套餐已存在'
      });
    }

    const plan = await MembershipPlan.create({
      name,
      type,
      price: parseFloat(price),
      originalPrice: originalPrice ? parseFloat(originalPrice) : null,
      duration: parseInt(duration),
      durationText,
      features: features || [],
      isPopular: isPopular || false,
      isActive: isActive !== false,
      sortOrder: sortOrder || 0,
      description
    });

    log.info(`[管理] 管理员 ${req.admin.username} 创建会员套餐: ${plan.name}`);
    res.status(201).json({
      status: true,
      message: '创建会员套餐成功',
      data: plan
    });
  } catch (error) {
    log.error('创建会员套餐失败:', error);
    res.status(500).json({
      status: false,
      message: '创建会员套餐失败',
      error: error.message
    });
  }
});

// 更新会员套餐
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const plan = await MembershipPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: '会员套餐不存在'
      });
    }

    // 如果更新类型，检查是否与其他套餐冲突
    if (updateData.type && updateData.type !== plan.type) {
      const existingPlan = await MembershipPlan.findOne({
        where: { 
          type: updateData.type, 
          id: { [Op.ne]: id }
        }
      });

      if (existingPlan) {
        return res.status(400).json({
          status: false,
          message: '该类型的会员套餐已存在'
        });
      }
    }

    // 转换数值类型
    if (updateData.price) updateData.price = parseFloat(updateData.price);
    if (updateData.originalPrice !== undefined) {
      updateData.originalPrice = updateData.originalPrice ? parseFloat(updateData.originalPrice) : null;
    }
    if (updateData.duration) updateData.duration = parseInt(updateData.duration);
    if (updateData.sortOrder !== undefined) updateData.sortOrder = parseInt(updateData.sortOrder);

    await plan.update(updateData);

    log.info(`[管理] 管理员 ${req.admin.username} 更新会员套餐: ${plan.name}`);
    res.json({
      status: true,
      message: '更新会员套餐成功',
      data: plan
    });
  } catch (error) {
    log.error('更新会员套餐失败:', error);
    res.status(500).json({
      status: false,
      message: '更新会员套餐失败',
      error: error.message
    });
  }
});

// 删除会员套餐（软删除）
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MembershipPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({
        status: false,
        message: '会员套餐不存在'
      });
    }

    await plan.destroy();

    log.info(`[管理] 管理员 ${req.admin.username} 删除会员套餐: ${plan.name}`);
    res.json({
      status: true,
      message: '删除会员套餐成功'
    });
  } catch (error) {
    log.error('删除会员套餐失败:', error);
    res.status(500).json({
      status: false,
      message: '删除会员套餐失败',
      error: error.message
    });
  }
});

// 批量更新排序
router.put('/batch/sort', adminAuth, async (req, res) => {
  try {
    const { plans } = req.body; // [{ id, sortOrder }]

    if (!Array.isArray(plans)) {
      return res.status(400).json({
        status: false,
        message: '参数格式错误，需要 plans 数组'
      });
    }

    const updatePromises = plans.map(({ id, sortOrder }) =>
      MembershipPlan.update(
        { sortOrder: parseInt(sortOrder) },
        { where: { id: parseInt(id) } }
      )
    );

    await Promise.all(updatePromises);

    log.info(`[管理] 管理员 ${req.admin.username} 批量更新会员套餐排序`);
    res.json({
      status: true,
      message: '批量更新排序成功'
    });
  } catch (error) {
    log.error('批量更新排序失败:', error);
    res.status(500).json({
      status: false,
      message: '批量更新排序失败',
      error: error.message
    });
  }
});

export default router;
