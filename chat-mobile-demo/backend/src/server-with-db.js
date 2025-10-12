import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';

// 导入配置
import { config } from './config/config.js';
import { log } from './config/logger.js';
import { testConnection } from './config/database.js';

// 导入模型
import { User, Moment, Comment, Like, Follow, Message, Bottle } from './models/index.js';
import { Op } from 'sequelize';

// 导入中间件
import { corsConfig, requestLogger, globalErrorHandler } from './middleware/cors.js';
import { authenticateToken, generateToken } from './middleware/auth.js';

// 导入路由
import momentRoutes from './routes/moment-db.js';
import adminMomentRoutes from './routes/adminMoment-db.js';
import adminUserRoutes from './routes/adminUser-db.js';

// 导入服务
import userService from './services/userService.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 10 * 1024 * 1024,
  pingTimeout: 60000,
  pingInterval: 25000
});

// 内存存储（仅用于WebSocket连接管理）
const connectedUsers = new Map(); // WebSocket连接映射
const pushTokens = new Map(); // 推送令牌

// 管理员账号（临时方案）
const admins = new Map();
admins.set('admin', {
  id: 'admin_001',
  username: 'admin',
  password: 'admin123',
  role: 'admin',
  createdAt: new Date().toISOString()
});

// 创建上传目录
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ========== 中间件配置 ==========
app.use(corsConfig);
app.use(requestLogger);
app.use(helmet());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// API限流
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// ========== 用户认证API ==========

// 发送验证码接口（简化版本，固定验证码123456）
app.post('/api/user/send-verification-code', (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.json({
        status: false,
        message: '手机号不能为空'
      });
    }

    // 简化处理，返回固定验证码（实际应接入短信服务）
    log.info(`验证码发送请求: 手机号=${phone}, 验证码=123456（固定）`);

    res.json({
      status: true,
      message: '验证码已发送',
      data: {
        code: '123456' // 开发环境返回验证码
      }
    });
  } catch (error) {
    log.error('发送验证码失败:', error);
    res.json({
      status: false,
      message: '发送验证码失败: ' + error.message
    });
  }
});

// 注册接口（同时支持两个路径以兼容前端）
app.post('/api/user/register', async (req, res) => {
  try {
    const { phone, username, nickname } = req.body;

    if (!phone) {
      return res.json({
        status: false,
        message: '手机号不能为空'
      });
    }

    // 检查用户是否已存在
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.json({
        status: false,
        message: '该手机号已注册'
      });
    }

    // 创建新用户
    const user = await User.create({
      uuid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phone,
      username: username || phone,
      nickname: nickname || `用户${phone.slice(-4)}`,
      password: '', // 手机号注册无需密码
      avatar: '👤',
      status: 'active'
    });

    // 生成token
    const token = generateToken({
      id: user.id,
      uuid: user.uuid,
      phone: user.phone,
      username: user.username
    });

    log.info(`用户注册成功: ${phone} (${user.uuid})`);

    res.json({
      status: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          phone: user.phone,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    log.error('注册失败:', error);
    res.json({
      status: false,
      message: '注册失败: ' + error.message
    });
  }
});

// 登录接口（同时支持两个路径以兼容前端）
app.post('/api/user/login', async (req, res) => {
  try {
    const { phone, verificationCode } = req.body;

    if (!phone) {
      return res.json({
        status: false,
        message: '手机号不能为空'
      });
    }

    // 简化验证码验证（实际应接入短信服务）
    if (verificationCode && verificationCode !== '123456') {
      return res.json({
        status: false,
        message: '验证码错误'
      });
    }

    // 查找用户
    let user = await User.findOne({ where: { phone } });

    // 如果用户不存在，自动注册
    if (!user) {
      user = await User.create({
        uuid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phone,
        username: phone,
        nickname: `用户${phone.slice(-4)}`,
        password: '',
        avatar: '👤',
        status: 'active'
      });
      log.info(`新用户自动注册: ${phone} (${user.uuid})`);
    }

    // 更新最后登录时间
    await user.update({ last_login: new Date() });

    // 生成token
    const token = generateToken({
      id: user.id,
      uuid: user.uuid,
      phone: user.phone,
      username: user.username
    });

    log.info(`用户登录成功: ${phone} (${user.uuid})`);

    res.json({
      status: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          phone: user.phone,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    log.error('登录失败:', error);
    res.json({
      status: false,
      message: '登录失败: ' + error.message
    });
  }
});

// 获取用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findOne({
      where: { uuid: req.user.uuid },
      attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar', 'bio', 'email', 'created_at']
    });

    if (!user) {
      return res.json({
        status: false,
        message: '用户不存在'
      });
    }

    res.json({
      status: true,
      data: user
    });
  } catch (error) {
    log.error('获取用户信息失败:', error);
    res.json({
      status: false,
      message: '获取用户信息失败: ' + error.message
    });
  }
});

// 更新用户信息
app.put('/api/user/profile', authenticateToken, async (req, res) => {
  try {
    const { nickname, bio, avatar } = req.body;
    
    const user = await User.findOne({ where: { uuid: req.user.uuid } });
    if (!user) {
      return res.json({
        status: false,
        message: '用户不存在'
      });
    }

    const updateData = {};
    if (nickname !== undefined) updateData.nickname = nickname;
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;

    await user.update(updateData);

    res.json({
      status: true,
      message: '更新成功',
      data: {
        id: user.id,
        uuid: user.uuid,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        bio: user.bio
      }
    });
  } catch (error) {
    log.error('更新用户信息失败:', error);
    res.json({
      status: false,
      message: '更新失败: ' + error.message
    });
  }
});

// ========== 关注功能API ==========

// 关注/取消关注用户
app.post('/api/follow/:target_uuid', authenticateToken, async (req, res) => {
  try {
    const { target_uuid } = req.params;
    const follower_uuid = req.user.uuid;

    if (target_uuid === follower_uuid) {
      return res.json({
        status: false,
        message: '不能关注自己'
      });
    }

    // 查找目标用户
    const targetUser = await User.findOne({ where: { uuid: target_uuid } });
    if (!targetUser) {
      return res.status(404).json({
        status: false,
        message: '目标用户不存在'
      });
    }

    // 查找当前用户
    const currentUser = await User.findOne({ where: { uuid: follower_uuid } });
    if (!currentUser) {
      return res.status(404).json({
        status: false,
        message: '当前用户不存在'
      });
    }

    // 检查是否已关注
    const existingFollow = await Follow.findOne({
      where: {
        follower_id: currentUser.id,
        following_id: targetUser.id
      }
    });

    if (existingFollow) {
      // 已关注，执行取消关注
      await existingFollow.destroy();
      
      return res.json({
        status: true,
        message: '已取消关注',
        data: {
          is_following: false
        }
      });
    } else {
      // 未关注，执行关注
      await Follow.create({
        follower_id: currentUser.id,
        following_id: targetUser.id,
        status: 'active'
      });

      return res.json({
        status: true,
        message: '关注成功',
        data: {
          is_following: true
        }
      });
    }
  } catch (error) {
    log.error('关注操作失败:', error);
    res.json({
      status: false,
      message: '操作失败: ' + error.message
    });
  }
});

// 获取关注列表
app.get('/api/follow/following/:user_uuid?', authenticateToken, async (req, res) => {
  try {
    const user_uuid = req.params.user_uuid || req.user.uuid;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    // 查找用户
    const user = await User.findOne({ where: { uuid: user_uuid } });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 获取关注列表
    const { count, rows } = await Follow.findAndCountAll({
      where: {
        follower_id: user.id,
        status: 'active'
      },
      include: [{
        model: User,
        as: 'following',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar', 'bio']
      }],
      limit: pageSize,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const followingList = rows.map(follow => ({
      user_id: follow.following.id,
      user_uuid: follow.following.uuid,
      phone: follow.following.phone,
      username: follow.following.username,
      nickname: follow.following.nickname,
      avatar: follow.following.avatar,
      bio: follow.following.bio,
      followed_at: follow.created_at
    }));

    res.json({
      status: true,
      data: {
        list: followingList,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      }
    });
  } catch (error) {
    log.error('获取关注列表失败:', error);
    res.json({
      status: false,
      message: '获取失败: ' + error.message
    });
  }
});

// 获取粉丝列表
app.get('/api/follow/followers/:user_uuid?', authenticateToken, async (req, res) => {
  try {
    const user_uuid = req.params.user_uuid || req.user.uuid;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const offset = (page - 1) * pageSize;

    // 查找用户
    const user = await User.findOne({ where: { uuid: user_uuid } });
    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 获取粉丝列表
    const { count, rows } = await Follow.findAndCountAll({
      where: {
        following_id: user.id,
        status: 'active'
      },
      include: [{
        model: User,
        as: 'follower',
        attributes: ['id', 'uuid', 'phone', 'username', 'nickname', 'avatar', 'bio']
      }],
      limit: pageSize,
      offset: offset,
      order: [['created_at', 'DESC']]
    });

    const followersList = rows.map(follow => ({
      user_id: follow.follower.id,
      user_uuid: follow.follower.uuid,
      phone: follow.follower.phone,
      username: follow.follower.username,
      nickname: follow.follower.nickname,
      avatar: follow.follower.avatar,
      bio: follow.follower.bio,
      followed_at: follow.created_at
    }));

    res.json({
      status: true,
      data: {
        list: followersList,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      }
    });
  } catch (error) {
    log.error('获取粉丝列表失败:', error);
    res.json({
      status: false,
      message: '获取失败: ' + error.message
    });
  }
});

// 检查关注状态
app.get('/api/follow/status/:target_uuid', authenticateToken, async (req, res) => {
  try {
    const { target_uuid } = req.params;
    const follower_uuid = req.user.uuid;

    // 查找两个用户
    const [currentUser, targetUser] = await Promise.all([
      User.findOne({ where: { uuid: follower_uuid } }),
      User.findOne({ where: { uuid: target_uuid } })
    ]);

    if (!currentUser || !targetUser) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    // 检查关注状态
    const follow = await Follow.findOne({
      where: {
        follower_id: currentUser.id,
        following_id: targetUser.id,
        status: 'active'
      }
    });

    res.json({
      status: true,
      data: {
        is_following: !!follow
      }
    });
  } catch (error) {
    log.error('检查关注状态失败:', error);
    res.json({
      status: false,
      message: '检查失败: ' + error.message
    });
  }
});

// ========== 动态相关API（使用路由） ==========
app.use('/api/moment', momentRoutes);

// ========== 管理动态API ==========
app.use('/api/admin/moments', adminMomentRoutes);

// ========== 管理员登录接口 ==========
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({
        status: false,
        message: '用户名和密码不能为空'
      });
    }
    
    const admin = admins.get(username);
    if (!admin || admin.password !== password) {
      return res.status(401).json({
        status: false,
        message: '用户名或密码错误'
      });
    }
    
    // 生成管理员token
    const token = jwt.sign({
      id: admin.id,
      username: admin.username,
      role: admin.role,
      type: 'admin'
    }, config.jwt.secret, {
      expiresIn: '24h'
    });
    
    log.info(`管理员登录成功: ${username}`);
    
    res.json({
      status: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role
        }
      }
    });
  } catch (error) {
    log.error('管理员登录失败:', error);
    res.status(500).json({
      status: false,
      message: '登录失败',
      error: error.message
    });
  }
});

// ========== 管理用户API ==========
app.use('/api/admin', adminUserRoutes);

// ========== 消息相关API ==========
// 发送消息
app.post('/api/message/send', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({
        status: false,
        message: '参数不完整'
      });
    }

    // 查找接收者
    const receiver = await User.findOne({ where: { uuid: receiverId } });
    if (!receiver) {
      return res.status(404).json({
        status: false,
        message: '接收者不存在'
      });
    }

    // 获取发送者的实际ID
    const sender = await User.findOne({ where: { uuid: req.user.uuid } });
    if (!sender) {
      return res.status(404).json({
        status: false,
        message: '发送者不存在'
      });
    }

    // 创建消息
    const message = await Message.create({
      uuid: uuidv4(),
      sender_id: sender.id,
      receiver_id: receiver.id,
      content: content.trim(),
      status: 'sent'
    });

    // 通过WebSocket发送消息
    const receiverSocket = connectedUsers.get(receiverId);
    if (receiverSocket) {
      receiverSocket.emit('new_message', {
        messageUuid: message.uuid,
        senderId: req.user.uuid,
        content: message.content,
        timestamp: message.created_at
      });
    }

    return res.status(201).json({
      status: true,
      message: '消息发送成功',
      data: {
        messageUuid: message.uuid,
        content: message.content,
        timestamp: message.created_at
      }
    });
  } catch (error) {
    log.error('发送消息失败:', error);
    return res.status(500).json({
      status: false,
      message: '发送消息失败'
    });
  }
});

// 获取对话列表
app.get('/api/message/conversations/:userId', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // 验证用户权限
    if (req.user.uuid !== userId) {
      return res.status(403).json({
        status: false,
        message: '无权限查看'
      });
    }

    // 获取所有与当前用户相关的对话（使用子查询避免GROUP BY问题）
    const conversations = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: userId },
          { receiver_id: userId }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['uuid', 'nickname', 'avatar']
        },
        {
          model: User,
          as: 'receiver',
          attributes: ['uuid', 'nickname', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']]
    });

    // 整理对话列表（去重并获取最新消息）
    const conversationMap = new Map();
    conversations.forEach(msg => {
      const otherUserId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      
      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, {
          otherUserId,
          otherUser,
          lastMessage: msg,
          unreadCount: 0
        });
      } else {
        // 如果已有对话，比较时间戳，保留最新的消息
        const existingConversation = conversationMap.get(otherUserId);
        if (new Date(msg.created_at) > new Date(existingConversation.lastMessage.created_at)) {
          existingConversation.lastMessage = msg;
        }
      }
    });

    const conversationList = Array.from(conversationMap.values());

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: conversationList
    });
  } catch (error) {
    log.error('获取对话列表失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取对话列表失败'
    });
  }
});

// 获取两个用户之间的对话
app.get('/api/message/conversation/:userId1/:userId2', authenticateToken, async (req, res) => {
  try {
    const { userId1, userId2 } = req.params;
    
    // 验证用户权限
    if (req.user.uuid !== userId1 && req.user.uuid !== userId2) {
      return res.status(403).json({
        status: false,
        message: '无权限查看'
      });
    }

    // 先将UUID转换为数据库ID
    const user1 = await User.findOne({ where: { uuid: userId1 }, attributes: ['id', 'uuid'] });
    const user2 = await User.findOne({ where: { uuid: userId2 }, attributes: ['id', 'uuid'] });
    
    if (!user1 || !user2) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    log.info(`[MESSAGE] 查询对话历史: ${user1.id} (${userId1.slice(-8)}) <-> ${user2.id} (${userId2.slice(-8)})`);

    // 获取两个用户之间的所有消息
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            sender_id: user1.id,
            receiver_id: user2.id
          },
          {
            sender_id: user2.id,
            receiver_id: user1.id
          }
        ]
      },
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'uuid', 'nickname', 'avatar']
        }
      ],
      order: [['created_at', 'ASC']]
    });

    log.info(`[MESSAGE] 找到 ${messages.length} 条消息`);

    // 格式化消息，确保字段正确
    const formattedMessages = messages.map(msg => ({
      uuid: msg.uuid,
      content: msg.content,
      message_type: msg.message_type,
      sender_uuid: msg.sender ? msg.sender.uuid : null,
      created_at: msg.created_at,
      status: msg.status,
      type: msg.message_type // 前端需要的字段
    }));

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: {
        messages: formattedMessages
      }
    });
  } catch (error) {
    log.error('获取对话失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取对话失败'
    });
  }
});

// ========== 文件上传API ==========
// 文件上传API（兼容前端调用的/api/file）
app.post('/api/file', authenticateToken, (req, res) => {
  const form = formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    filter: ({ name, originalFilename, mimetype }) => {
      // 只允许图片文件
      return mimetype && mimetype.includes('image');
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      log.error('文件上传失败:', err);
      return res.status(500).json({
        status: false,
        message: '文件上传失败: ' + err.message
      });
    }

    const file = files.file;
    if (!file) {
      return res.status(400).json({
        status: false,
        message: '没有上传文件'
      });
    }

    // 生成新的文件名
    const ext = path.extname(file.originalFilename || '');
    const newFilename = `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    const newPath = path.join(uploadsDir, newFilename);

    // 重命名文件
    fs.rename(file.filepath, newPath, (renameErr) => {
      if (renameErr) {
        log.error('文件重命名失败:', renameErr);
        return res.status(500).json({
          status: false,
          message: '文件处理失败'
        });
      }

      // 返回文件信息
      res.json({
        status: true,
        message: '文件上传成功',
        data: {
          filename: newFilename,
          url: `/uploads/${newFilename}`,
          size: file.size,
          mimetype: file.mimetype
        }
      });
    });
  });
});

app.post('/api/upload', authenticateToken, (req, res) => {
  const form = formidable({
    uploadDir: uploadsDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024,
    filename: (name, ext, part) => {
      return `img-${Date.now()}-${Math.floor(Math.random() * 1000000000)}${ext}`;
    }
  });

  form.parse(req, (err, fields, files) => {
    if (err) {
      log.error('文件上传失败:', err);
      return res.json({
        status: false,
        message: '文件上传失败: ' + err.message
      });
    }

    const file = files.file;
    if (!file || file.length === 0) {
      return res.json({
        status: false,
        message: '没有接收到文件'
      });
    }

    const uploadedFile = Array.isArray(file) ? file[0] : file;
    const filename = path.basename(uploadedFile.filepath);
    const fileUrl = `http://${config.app.host}:${config.app.port}/uploads/${filename}`;

    log.info(`文件上传成功: ${filename}`);

    res.json({
      status: true,
      message: '上传成功',
      data: {
        filename,
        url: fileUrl,
        path: `/uploads/${filename}`
      }
    });
  });
});

// ========== WebSocket处理 ==========
io.on('connection', (socket) => {
  log.info(`WebSocket连接建立: ${socket.id}`);

  socket.on('register', async (userData) => {
    try {
      const { uuid, phone } = userData;

      if (!uuid || !phone) {
        socket.emit('error', { message: '注册信息不完整' });
        return;
      }

      // 确保用户在数据库中存在
      let user = await User.findOne({ where: { uuid } });
      
      if (!user) {
        // 如果用户不存在，创建用户记录
        user = await User.create({
          uuid,
          phone,
          username: phone,
          nickname: `用户${phone.slice(-4)}`,
          password: '',
          avatar: '👤',
          status: 'active'
        });
        log.info(`WebSocket连接时创建用户记录: ${phone} (${uuid})`);
      }

      // 将用户添加到连接映射中
      connectedUsers.set(uuid, socket);
      socket.userUuid = uuid;
      socket.phone = phone;

      log.info(`用户注册WebSocket: ${phone} (${uuid})`);

      socket.emit('registered', {
        status: true,
        message: '注册成功',
        user: {
          uuid,
          phone
        }
      });

      // 通知其他在线用户
      socket.broadcast.emit('user_online', { uuid, phone });
    } catch (error) {
      log.error('WebSocket注册失败:', error);
      socket.emit('error', { message: '注册失败: ' + error.message });
    }
  });

  // 私聊消息
  socket.on('private_message', async (data) => {
    try {
      const { to, message, type, fileUrl } = data;
      const from = socket.userUuid;

      if (!from || !to) {
        socket.emit('error', { message: '消息信息不完整' });
        return;
      }

      // 查找发送者和接收者
      const [sender, receiver] = await Promise.all([
        User.findOne({ where: { uuid: from } }),
        User.findOne({ where: { uuid: to } })
      ]);

      if (!sender || !receiver) {
        socket.emit('error', { message: '用户不存在' });
        return;
      }

      // 保存消息到数据库
      const newMessage = await Message.create({
        uuid: uuidv4(),
        sender_id: sender.id,
        receiver_id: receiver.id,
        message_type: type || 'text',
        content: message,
        file_url: fileUrl,
        status: 'sent'
      });

      const messageData = {
        id: newMessage.id,
        uuid: newMessage.uuid,
        from,
        to,
        message,
        type: type || 'text',
        fileUrl,
        timestamp: newMessage.created_at,
        status: 'sent'
      };

      // 发送给接收者
      const recipientSocket = connectedUsers.get(to);
      if (recipientSocket) {
        recipientSocket.emit('private_message', messageData);
        // 更新消息状态为已送达
        await newMessage.update({ status: 'delivered' });
        messageData.status = 'delivered';
      }

      // 回传给发送者确认
      socket.emit('message_sent', messageData);

      log.info(`私聊消息: ${from} -> ${to}`);
    } catch (error) {
      log.error('发送私聊消息失败:', error);
      socket.emit('error', { message: '发送失败: ' + error.message });
    }
  });

  // 消息已读
  socket.on('message_read', async (data) => {
    try {
      const { messageUuid } = data;
      
      const message = await Message.findOne({ where: { uuid: messageUuid } });
      if (message) {
        await message.update({
          is_read: true,
          read_at: new Date(),
          status: 'read'
        });

        // 通知发送者消息已读
        const senderSocket = connectedUsers.get(message.sender_id);
        if (senderSocket) {
          senderSocket.emit('message_read', {
            messageUuid,
            readAt: message.read_at
          });
        }
      }
    } catch (error) {
      log.error('标记消息已读失败:', error);
    }
  });

  // 断开连接
  socket.on('disconnect', () => {
    if (socket.userUuid) {
      connectedUsers.delete(socket.userUuid);
      socket.broadcast.emit('user_offline', {
        uuid: socket.userUuid,
        phone: socket.phone
      });
      log.info(`用户断开连接: ${socket.phone} (${socket.userUuid})`);
    }
    log.info(`WebSocket连接断开: ${socket.id}`);
  });
});

// ========== 漂流瓶API ==========
// 扔瓶子
app.post('/api/bottle/throw', authenticateToken, async (req, res) => {
  try {
    // 兼容 text/plain 的 JSON 字符串
    let body = req.body;
    if (typeof body === 'string' && body.trim().startsWith('{')) {
      try { body = JSON.parse(body); } catch {}
    }
    const { content, mood } = body || {};

    if (!content || String(content).trim().length === 0) {
      return res.status(400).json({ status: false, message: '内容不能为空' });
    }

    // 创建漂流瓶
    const bottle = await Bottle.create({
      uuid: uuidv4(), // 手动生成uuid
      content: String(content).slice(0, 1000),
      mood: mood || '',
      sender_uuid: req.user.uuid,
      status: 'sea'
    });

    return res.status(201).json({
      status: true,
      message: '扔瓶子成功',
      data: {
        uuid: bottle.uuid,
        created_at: bottle.created_at
      }
    });
  } catch (error) {
    log.error('扔瓶子失败:', error);
    return res.status(500).json({ status: false, message: '扔瓶子失败' });
  }
});

// 捞瓶子
app.post('/api/bottle/fish', authenticateToken, async (req, res) => {
  try {
    const myUuid = req.user.uuid;
    
    // 随机捞一个非自己的且未被捞走的瓶子
    const bottle = await Bottle.findOne({
      where: {
        status: 'sea',
        sender_uuid: { [Op.ne]: myUuid }
      },
      order: [['created_at', 'ASC']] // 捞最老的瓶子
    });

    if (!bottle) {
      return res.status(200).json({ 
        status: true, 
        message: '当前海里没有可捞的瓶子',
        data: null
      });
    }

    // 更新瓶子状态
    await bottle.update({
      status: 'picked',
      receiver_uuid: myUuid,
      picked_at: new Date()
    });

    // 获取发送者和接收者的信息
    const sender = await User.findOne({ where: { uuid: bottle.sender_uuid } });
    const receiver = await User.findOne({ where: { uuid: myUuid } });

    // 自动创建一条瓶子消息记录到对话历史中
    if (sender && receiver) {
      try {
        const { v4: uuidv4 } = await import('uuid');
        await Message.create({
          uuid: uuidv4(),
          sender_id: sender.id,
          receiver_id: receiver.id,
          content: `🌊 漂流瓶消息: ${bottle.content}`,
          message_type: 'text',
          status: 'sent'
        });
        log.info(`[BOTTLE] 瓶子消息已添加到对话历史: ${sender.id} -> ${receiver.id}`);
      } catch (msgError) {
        log.error('[BOTTLE] 创建瓶子消息失败:', msgError);
        // 不影响捞瓶子的主流程，只记录错误
      }
    }

    return res.status(200).json({
      status: true,
      message: '捞到瓶子了！',
      data: {
        uuid: bottle.uuid,
        content: bottle.content,
        mood: bottle.mood,
        sender_uuid: bottle.sender_uuid,
        sender_nickname: sender ? sender.nickname : `用户${bottle.sender_uuid.slice(-4)}`,
        picked_at: bottle.picked_at,
        created_at: bottle.created_at
      }
    });
  } catch (error) {
    log.error('捞瓶子失败:', error);
    return res.status(500).json({ status: false, message: '捞瓶子失败' });
  }
});

// 回复瓶子
app.post('/api/bottle/reply', authenticateToken, async (req, res) => {
  try {
    const { bottleId, reply } = req.body;
    
    if (!bottleId || !reply) {
      return res.status(400).json({ status: false, message: '参数不完整' });
    }

    // 查找瓶子
    const bottle = await Bottle.findByPk(bottleId);
    if (!bottle) {
      return res.status(404).json({ status: false, message: '瓶子不存在' });
    }

    // 验证权限（只有捞到瓶子的人可以回复）
    if (bottle.receiver_uuid !== req.user.uuid) {
      return res.status(403).json({ status: false, message: '无权限回复此瓶子' });
    }

    // 获取发送者和接收者的实际ID
    const sender = await User.findOne({ where: { uuid: req.user.uuid } });
    const receiver = await User.findOne({ where: { uuid: bottle.sender_uuid } });
    
    if (!sender || !receiver) {
      return res.status(404).json({ status: false, message: '用户不存在' });
    }

    // 创建回复消息
    const message = await Message.create({
      uuid: uuidv4(),
      sender_id: sender.id,
      receiver_id: receiver.id,
      content: `回复漂流瓶: ${reply}`,
      status: 'sent'
    });

    // 通过WebSocket发送消息
    const receiverSocket = connectedUsers.get(bottle.sender_uuid);
    if (receiverSocket) {
      receiverSocket.emit('new_message', {
        id: message.uuid,
        sender_id: sender.uuid,
        receiver_id: receiver.uuid,
        content: message.content,
        created_at: message.created_at,
        sender_nickname: sender.nickname,
        sender_avatar: sender.avatar
      });
    }

    return res.status(201).json({
      status: true,
      message: '回复成功',
      data: {
        message_id: message.uuid,
        created_at: message.created_at
      }
    });
  } catch (error) {
    log.error('回复瓶子失败:', error);
    return res.status(500).json({ status: false, message: '回复瓶子失败' });
  }
});

// 获取我的瓶子列表
app.get('/api/bottle/user/:uuid', authenticateToken, async (req, res) => {
  try {
    const { uuid } = req.params;
    
    // 验证用户权限
    if (req.user.uuid !== uuid) {
      return res.status(403).json({ status: false, message: '无权限查看' });
    }

    const bottles = await Bottle.findAll({
      where: {
        [Op.or]: [
          { sender_uuid: uuid },
          { receiver_uuid: uuid }
        ]
      },
      order: [['created_at', 'DESC']]
    });

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: bottles
    });
  } catch (error) {
    log.error('获取瓶子列表失败:', error);
    return res.status(500).json({ status: false, message: '获取瓶子列表失败' });
  }
});

// 回复瓶子
app.post('/api/bottle/reply', authenticateToken, async (req, res) => {
  try {
    const { bottleId, reply } = req.body;
    
    if (!bottleId || !reply) {
      return res.status(400).json({ status: false, message: '参数不完整' });
    }

    // 查找瓶子
    const bottle = await Bottle.findByPk(bottleId);
    if (!bottle) {
      return res.status(404).json({ status: false, message: '瓶子不存在' });
    }

    // 验证权限（只有捞到瓶子的人可以回复）
    if (bottle.receiver_uuid !== req.user.uuid) {
      return res.status(403).json({ status: false, message: '无权限回复' });
    }

    // 创建回复消息
    const message = await Message.create({
      uuid: uuidv4(),
      sender_id: req.user.uuid,
      receiver_id: bottle.sender_uuid,
      content: reply,
      status: 'bottle_reply',
      bottle_uuid: bottle.uuid
    });

    // 更新瓶子状态
    await bottle.update({
      status: 'replied'
    });

    return res.status(201).json({
      status: true,
      message: '回复成功',
      data: {
        messageUuid: message.uuid,
        content: message.content,
        created_at: message.created_at
      }
    });
  } catch (error) {
    log.error('回复瓶子失败:', error);
    return res.status(500).json({ status: false, message: '回复瓶子失败' });
  }
});

// ========== 健康检查 ==========
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== 错误处理 ==========
app.use(globalErrorHandler);

// ========== 启动服务器 ==========
async function startServer() {
  try {
    // 测试数据库连接
    log.info('🔄 测试数据库连接...');
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      log.error('❌ 数据库连接失败，无法启动服务器');
      process.exit(1);
    }

    // 启动服务器
    server.listen(config.app.port, config.app.host, () => {
      log.info('='.repeat(50));
      log.info(`🚀 服务器启动成功！`);
      log.info(`📡 HTTP: http://${config.app.host}:${config.app.port}`);
      log.info(`🔌 WebSocket: ws://${config.app.host}:${config.app.port}`);
      log.info(`🗄️  数据库: MySQL (${config.database.name})`);
      log.info(`📝 日志级别: ${config.log.level}`);
      log.info(`🌍 环境: ${config.app.env}`);
      log.info('='.repeat(50));
    });
  } catch (error) {
    log.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

export { io, connectedUsers };

