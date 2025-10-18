import express from 'express';
import multer from 'multer';

const router = express.Router();

// 配置 multer 内存存储
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // 允许的图片类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件 (jpeg, jpg, png, gif, webp)'));
    }
  }
});

// 全局用户存储的引用（将在server-simple.js中设置）
let globalUsers = null;

// 设置全局用户存储
export const setGlobalUsers = (users) => {
  globalUsers = users;
};

// 模拟用户数据（临时方案）
const mockUsers = [
  {
    id: 'user_001',
    username: '张三',
    phone: '13800138001',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 'user_002',
    username: '李四',
    phone: '13800138002',
    status: 'active',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    lastLogin: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 'user_003',
    username: '王五',
    phone: '13800138003',
    status: 'banned',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    lastLogin: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: 'user_004',
    username: '赵六',
    phone: '13800138004',
    status: 'active',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    lastLogin: new Date(Date.now() - 1800000).toISOString()
  },
  {
    id: 'user_005',
    username: '钱七',
    phone: '13800138005',
    status: 'frozen',
    createdAt: new Date(Date.now() - 432000000).toISOString(),
    lastLogin: new Date(Date.now() - 172800000).toISOString()
  }
];

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
    
    // 获取真实用户数据
    let allUsers = [];
    if (globalUsers && globalUsers.size > 0) {
      // 从内存Map中获取用户数据
      allUsers = Array.from(globalUsers.values()).map(user => ({
        id: user.id,
        uuid: user.uuid,
        username: user.username,
        nickname: user.nickname,
        phone: user.phone,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        createdAt: user.created_at,
        lastLogin: user.lastLogin
      }));
    } else {
      // 如果没有真实数据，使用模拟数据
      allUsers = mockUsers;
    }
    
    // 应用筛选条件
    let filteredUsers = allUsers;
    
    if (username) {
      filteredUsers = filteredUsers.filter(user => 
        user.username.toLowerCase().includes(username.toLowerCase())
      );
    }
    if (phone) {
      filteredUsers = filteredUsers.filter(user => 
        user.phone.includes(phone)
      );
    }
    if (status) {
      filteredUsers = filteredUsers.filter(user => 
        user.status === status
      );
    }
    
    // 排序
    filteredUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // 分页
    const total = filteredUsers.length;
    const users = filteredUsers.slice(skip, skip + limit);
    
    res.json({
      status: true,
      data: {
        list: users.map(user => ({
          id: user.id,
          username: user.username,
          phone: user.phone,
          status: user.status,
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
 * 获取用户统计数据
 * GET /api/admin/users/statistics
 */
router.get('/users/statistics', adminAuth, async (req, res) => {
  try {
    const total = mockUsers.length;
    
    // 今日新增用户
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = mockUsers.filter(user => 
      new Date(user.createdAt) >= today
    ).length;
    
    // 活跃用户（最近7天登录）
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const activeUsers = mockUsers.filter(user => 
      new Date(user.lastLogin) >= sevenDaysAgo
    ).length;
    
    res.json({
      status: true,
      data: {
        total,
        todayUsers,
        activeUsers,
        bannedUsers: mockUsers.filter(user => user.status === 'banned').length,
        frozenUsers: mockUsers.filter(user => user.status === 'frozen').length
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

/**
 * 获取用户详情
 * GET /api/admin/users/:id
 */
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = mockUsers.find(u => u.id === id);
    
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    res.json({
      status: true,
      data: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        status: user.status,
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
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    // 更新用户信息
    if (username) mockUsers[userIndex].username = username;
    if (status) mockUsers[userIndex].status = status;
    
    const user = mockUsers[userIndex];
    
    res.json({
      status: true,
      message: '更新成功',
      data: {
        id: user.id,
        username: user.username,
        phone: user.phone,
        status: user.status,
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
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    mockUsers[userIndex].status = status;
    const user = mockUsers[userIndex];
    
    res.json({
      status: true,
      message: '状态更新成功',
      data: {
        id: user.id,
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
    
    const userIndex = mockUsers.findIndex(u => u.id === id);
    if (userIndex === -1) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }
    
    mockUsers.splice(userIndex, 1);
    
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
    
    let modifiedCount = 0;
    switch (operation) {
      case 'ban':
        userIds.forEach(id => {
          const userIndex = mockUsers.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            mockUsers[userIndex].status = 'banned';
            modifiedCount++;
          }
        });
        break;
      case 'unban':
        userIds.forEach(id => {
          const userIndex = mockUsers.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            mockUsers[userIndex].status = 'active';
            modifiedCount++;
          }
        });
        break;
      case 'delete':
        userIds.forEach(id => {
          const userIndex = mockUsers.findIndex(u => u.id === id);
          if (userIndex !== -1) {
            mockUsers.splice(userIndex, 1);
            modifiedCount++;
          }
        });
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
        modifiedCount: modifiedCount
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

// 动态管理 - 获取待审核动态
router.get('/moments/pending', adminAuth, async (req, res) => {
  try {
    // 这里应该调用动态服务的API
    // 暂时返回模拟数据
    const mockPendingMoments = [
      {
        id: 1,
        uuid: 'moment_1',
        content: '今天天气真好！',
        images: [],
        privacy: 'public',
        status: 'pending',
        user_id: 1,
        created_at: new Date(),
        author: {
          id: 1,
          username: 'testuser1',
          nickname: '测试用户1',
          phone: '13800138001'
        }
      },
      {
        id: 2,
        uuid: 'moment_2',
        content: '分享一张美图',
        images: ['image1.jpg'],
        privacy: 'public',
        status: 'pending',
        user_id: 2,
        created_at: new Date(),
        author: {
          id: 2,
          username: 'testuser2',
          nickname: '测试用户2',
          phone: '13800138002'
        }
      }
    ];

    res.json({
      status: true,
      data: {
        list: mockPendingMoments,
        total: mockPendingMoments.length,
        page: 1,
        pageSize: 10
      }
    });
  } catch (error) {
    console.error('获取待审核动态失败:', error);
    res.status(500).json({ status: false, message: '获取待审核动态失败' });
  }
});

// 动态管理 - 审核动态（已移动到 adminMoment.js）
// 这个路由已经在 adminMoment.js 中实现，此处删除以避免冲突

export default router;

