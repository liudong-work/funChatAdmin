const express = require('express');
const router = express.Router();
const User = require('../models/User');

// 管理员认证中间件（简单版本）
const adminAuth = (req, res, next) => {
  // TODO: 实现真正的管理员认证
  // 目前暂时跳过认证
  next();
};

/**
 * 获取用户列表
 * GET /api/admin/users
 */
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 10, username, phone, status } = req.query;
    
    // 构建查询条件
    const query = {};
    if (username) {
      query.username = new RegExp(username, 'i'); // 模糊搜索
    }
    if (phone) {
      query.phone = new RegExp(phone, 'i');
    }
    if (status) {
      query.status = status;
    }
    
    // 计算分页
    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);
    
    // 查询用户列表
    const users = await User.find(query)
      .select('-password') // 排除密码字段
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // 获取总数
    const total = await User.countDocuments(query);
    
    res.json({
      status: true,
      data: {
        list: users.map(user => ({
          id: user.uuid,
          username: user.username,
          phone: user.phone,
          status: user.status || 'active',
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        })),
        total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取用户列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户列表失败',
      error: error.message
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
    
    const user = await User.findOne({ uuid: id }).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      status: true,
      data: {
        id: user.uuid,
        username: user.username,
        phone: user.phone,
        status: user.status || 'active',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('获取用户详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户详情失败',
      error: error.message
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
    const { username, status } = req.body;
    
    const updateData = {};
    if (username) updateData.username = username;
    if (status) updateData.status = status;
    
    const user = await User.findOneAndUpdate(
      { uuid: id },
      updateData,
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      status: true,
      message: '更新成功',
      data: {
        id: user.uuid,
        username: user.username,
        phone: user.phone,
        status: user.status || 'active',
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('更新用户信息失败:', error);
    res.status(500).json({
      status: false,
      message: '更新用户信息失败',
      error: error.message
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
    
    if (!status || !['active', 'banned', 'frozen'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: '无效的状态值'
      });
    }
    
    const user = await User.findOneAndUpdate(
      { uuid: id },
      { status },
      { new: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      status: true,
      message: '状态更新成功',
      data: {
        id: user.uuid,
        status: user.status
      }
    });
  } catch (error) {
    console.error('更新用户状态失败:', error);
    res.status(500).json({
      status: false,
      message: '更新用户状态失败',
      error: error.message
    });
  }
});

/**
 * 删除用户
 * DELETE /api/admin/users/:id
 */
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findOneAndDelete({ uuid: id });
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除用户失败:', error);
    res.status(500).json({
      status: false,
      message: '删除用户失败',
      error: error.message
    });
  }
});

/**
 * 批量操作用户
 * POST /api/admin/users/batch
 */
router.post('/users/batch', adminAuth, async (req, res) => {
  try {
    const { userIds, operation } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: false,
        message: '无效的用户ID列表'
      });
    }
    
    let result;
    switch (operation) {
      case 'ban':
        result = await User.updateMany(
          { uuid: { $in: userIds } },
          { status: 'banned' }
        );
        break;
      case 'unban':
        result = await User.updateMany(
          { uuid: { $in: userIds } },
          { status: 'active' }
        );
        break;
      case 'delete':
        result = await User.deleteMany({ uuid: { $in: userIds } });
        break;
      default:
        return res.status(400).json({
          status: false,
          message: '无效的操作类型'
        });
    }
    
    res.json({
      status: true,
      message: '批量操作成功',
      data: {
        modifiedCount: result.modifiedCount || result.deletedCount
      }
    });
  } catch (error) {
    console.error('批量操作失败:', error);
    res.status(500).json({
      status: false,
      message: '批量操作失败',
      error: error.message
    });
  }
});

/**
 * 获取用户统计数据
 * GET /api/admin/users/statistics
 */
router.get('/users/statistics', adminAuth, async (req, res) => {
  try {
    const total = await User.countDocuments();
    
    // 今日新增用户
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = await User.countDocuments({
      createdAt: { $gte: today }
    });
    
    // 活跃用户（最近7天登录）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = await User.countDocuments({
      lastLogin: { $gte: sevenDaysAgo }
    });
    
    res.json({
      status: true,
      data: {
        total,
        todayUsers,
        activeUsers,
        bannedUsers: await User.countDocuments({ status: 'banned' }),
        frozenUsers: await User.countDocuments({ status: 'frozen' })
      }
    });
  } catch (error) {
    console.error('获取统计数据失败:', error);
    res.status(500).json({
      status: false,
      message: '获取统计数据失败',
      error: error.message
    });
  }
});

module.exports = router;

