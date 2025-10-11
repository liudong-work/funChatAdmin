import express from 'express';
import { Op } from 'sequelize';
import jwt from 'jsonwebtoken';
import { User } from '../models/index.js';
import { log } from '../config/logger.js';
import { config } from '../config/config.js';

const router = express.Router();

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        status: false,
        message: '访问令牌缺失'
      });
    }

    // 验证JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 检查是否为管理员token
    if (decoded.type !== 'admin' || decoded.role !== 'admin') {
      return res.status(403).json({
        status: false,
        message: '权限不足，需要管理员权限'
      });
    }

    req.admin = {
      id: decoded.id,
      username: decoded.username,
      role: decoded.role
    };
    
    next();
  } catch (error) {
    log.error('管理员认证失败:', error);
    return res.status(403).json({
      status: false,
      message: '访问令牌无效或已过期'
    });
  }
};

/**
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, username, phone, status } = req.query;
    
    log.info('[管理] 查询用户列表...', { page, pageSize, username, phone, status });
    
    // 构建查询条件
    const whereCondition = {};
    
    if (username) {
      whereCondition.username = {
        [Op.like]: `%${username}%`
      };
    }
    
    if (phone) {
      whereCondition.phone = {
        [Op.like]: `%${phone}%`
      };
    }
    
    if (status) {
      whereCondition.status = status;
    }
    
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询用户数据
    const { count, rows: users } = await User.findAndCountAll({
      where: whereCondition,
      attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'email', 'avatar', 'status', 'createdAt', 'last_login'],
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });
    
    log.info(`[管理] 数据库查询结果: 找到 ${count} 条用户记录`);
    log.info(`[管理] 第一个用户原始数据:`, users[0] ? {
      id: users[0].id,
      username: users[0].username,
      createdAt: users[0].createdAt,
      last_login: users[0].last_login
    } : '无用户数据');
    
    // 格式化数据
    const formattedUsers = users.map(user => ({
      id: user.id,
      uuid: user.uuid,
      username: user.username || user.phone,
      nickname: user.nickname || user.username,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar || '👤',
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.last_login
    }));
    
    res.json({
      status: true,
      data: {
        list: formattedUsers,
        total: count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    log.error('[管理] 获取用户列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户列表失败'
    });
  }
});

/**
 * 获取用户统计数据
 * GET /api/admin/users/statistics
 */
router.get('/users/statistics', adminAuth, async (req, res) => {
  try {
    log.info('[管理] 查询用户统计...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const [
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek
    ] = await Promise.all([
      User.count({ paranoid: false }), // 包括软删除的用户
      User.count({ where: { status: 'active' } }),
      User.count({
        where: {
          created_at: { [Op.gte]: today }
        }
      }),
      User.count({
        where: {
          created_at: { [Op.gte]: weekAgo }
        }
      })
    ]);
    
    const stats = {
      total: totalUsers,
      active: activeUsers,
      today: newUsersToday,
      thisWeek: newUsersThisWeek
    };
    
    log.info('[管理] 用户统计结果:', stats);
    
    res.json({
      status: true,
      data: stats
    });
  } catch (error) {
    log.error('[管理] 获取用户统计失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户统计失败'
    });
  }
});

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    log.info('[管理] 查询用户详情:', { id });
    
    const user = await User.findByPk(id, {
      attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'email', 'avatar', 'bio', 'status', 'created_at', 'last_login'],
      paranoid: false // 包括软删除的用户
    });
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    const formattedUser = {
      id: user.id,
      uuid: user.uuid,
      username: user.username || user.phone,
      nickname: user.nickname || user.username,
      phone: user.phone,
      email: user.email,
      avatar: user.avatar || '👤',
      bio: user.bio,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.last_login
    };
    
    res.json({
      status: true,
      data: formattedUser
    });
  } catch (error) {
    log.error('[管理] 获取用户详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户详情失败'
    });
  }
});

/**
 * 更新用户信息
 * PUT /api/admin/users/:id
 */
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { username, nickname, email, bio, status } = req.body;
    
    log.info('[管理] 更新用户信息:', { id, username, nickname, email, status });
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    // 构建更新数据
    const updateData = {};
    if (username !== undefined) updateData.username = username;
    if (nickname !== undefined) updateData.nickname = nickname;
    if (email !== undefined) updateData.email = email;
    if (bio !== undefined) updateData.bio = bio;
    if (status !== undefined) updateData.status = status;
    
    await user.update(updateData);
    
    log.info(`[管理] 用户信息更新成功: ${id}`);
    
    res.json({
      status: true,
      message: '更新成功',
      data: {
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.createdAt,
        lastLogin: user.last_login
      }
    });
  } catch (error) {
    log.error('[管理] 更新用户信息失败:', error);
    res.status(500).json({
      status: false,
      message: '更新用户信息失败'
    });
  }
});

/**
 * 更新用户状态
 * PUT /api/admin/users/:id/status
 */
router.put('/users/:id/status', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    log.info('[管理] 更新用户状态:', { id, status });
    
    if (!status || !['active', 'inactive', 'banned'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: '状态值无效'
      });
    }
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    await user.update({ status });
    
    log.info(`[管理] 用户状态更新成功: ${id} -> ${status}`);
    
    res.json({
      status: true,
      message: '状态更新成功',
      data: {
        id: user.id,
        status: user.status
      }
    });
  } catch (error) {
    log.error('[管理] 更新用户状态失败:', error);
    res.status(500).json({
      status: false,
      message: '更新用户状态失败'
    });
  }
});

/**
 * 删除用户（软删除）
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    log.info('[管理] 删除用户:', { id });
    
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    // 软删除用户
    await user.destroy();
    
    log.info(`[管理] 用户删除成功: ${id}`);
    
    res.json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    log.error('[管理] 删除用户失败:', error);
    res.status(500).json({
      status: false,
      message: '删除用户失败'
    });
  }
});

/**
 * 批量操作用户
 * POST /api/admin/users/batch
 */
router.post('/users/batch', adminAuth, async (req, res) => {
  try {
    const { action, userIds, status } = req.body;
    
    log.info('[管理] 批量操作用户:', { action, userIds, status });
    
    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({
        status: false,
        message: '参数无效'
      });
    }
    
    let updateData = {};
    
    switch (action) {
      case 'activate':
        updateData = { status: 'active' };
        break;
      case 'deactivate':
        updateData = { status: 'inactive' };
        break;
      case 'ban':
        updateData = { status: 'banned' };
        break;
      case 'delete':
        // 批量软删除
        await User.destroy({
          where: { id: { [Op.in]: userIds } }
        });
        
        log.info(`[管理] 批量删除用户成功: ${userIds.length} 个用户`);
        
        return res.json({
          status: true,
          message: `成功删除 ${userIds.length} 个用户`
        });
      default:
        return res.status(400).json({
          status: false,
          message: '操作类型无效'
        });
    }
    
    // 批量更新状态
    const [affectedCount] = await User.update(updateData, {
      where: { id: { [Op.in]: userIds } }
    });
    
    log.info(`[管理] 批量更新用户状态成功: ${affectedCount} 个用户`);
    
    res.json({
      status: true,
      message: `成功更新 ${affectedCount} 个用户状态`
    });
  } catch (error) {
    log.error('[管理] 批量操作用户失败:', error);
    res.status(500).json({
      status: false,
      message: '批量操作失败'
    });
  }
});

export default router;
