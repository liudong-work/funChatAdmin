import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';

// 导入配置
import { config } from './config/config.js';
import { log } from './config/logger.js';

// 导入中间件
import { corsConfig, requestLogger, globalErrorHandler } from './middleware/cors.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 内存存储（临时方案）
const users = new Map();
const connectedUsers = new Map();

// 生成JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    uuid: user.uuid,
    phone: user.phone,
    username: user.username
  };
  
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

// 验证JWT token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    log.error('Token验证失败:', error);
    return null;
  }
};

// 认证中间件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: false,
      message: '访问令牌缺失'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({
      status: false,
      message: '访问令牌无效'
    });
  }

  req.user = decoded;
  next();
};

// 设置中间件
app.use(helmet());
app.use(compression());
app.use(corsConfig);
app.use(requestLogger);

// 限流中间件
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    status: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use('/api', limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: true,
    message: '漂流瓶服务器运行正常',
    timestamp: new Date().toISOString(),
    version: config.app.version
  });
});

// 用户注册
app.post('/api/user/register', (req, res) => {
  try {
    const { phone, username, nickname, email } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        status: false,
        message: '手机号不能为空'
      });
    }

    // 检查手机号是否已存在
    if (users.has(phone)) {
      return res.status(400).json({
        status: false,
        message: '手机号已注册'
      });
    }

    // 创建用户
    const user = {
      id: Date.now(),
      uuid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      phone,
      username: username || phone,
      nickname: nickname || `用户${phone.slice(-4)}`,
      email: email || '',
      avatar: '',
      status: 'active',
      created_at: new Date()
    };

    users.set(phone, user);

    // 生成JWT令牌
    const token = generateToken(user);

    log.info(`用户注册成功: ${phone}`);

    res.status(201).json({
      status: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          phone: user.phone,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    log.error('用户注册失败:', error);
    res.status(500).json({
      status: false,
      message: '注册失败'
    });
  }
});

// 用户登录
app.post('/api/user/login', (req, res) => {
  try {
    const { phone, verificationCode } = req.body;
    
    if (!phone || !verificationCode) {
      return res.status(400).json({
        status: false,
        message: '手机号和验证码不能为空'
      });
    }

    // 查找用户
    const user = users.get(phone);
    if (!user) {
      return res.status(400).json({
        status: false,
        message: '手机号未注册'
      });
    }

    if (user.status !== 'active') {
      return res.status(400).json({
        status: false,
        message: '账户已被禁用'
      });
    }

    // 验证码验证（简化处理）
    if (verificationCode !== '123456') {
      return res.status(400).json({
        status: false,
        message: '验证码错误'
      });
    }

    // 生成JWT令牌
    const token = generateToken(user);

    log.info(`用户登录成功: ${phone}`);

    res.status(200).json({
      status: true,
      message: '登录成功',
      data: {
        user: {
          id: user.id,
          uuid: user.uuid,
          phone: user.phone,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          email: user.email
        },
        token
      }
    });
  } catch (error) {
    log.error('用户登录失败:', error);
    res.status(500).json({
      status: false,
      message: '登录失败'
    });
  }
});

// 获取用户详情
app.get('/api/user/:uuid', authenticateToken, (req, res) => {
  try {
    const { uuid } = req.params;
    
    // 查找用户
    let user = null;
    for (const [phone, userData] of users) {
      if (userData.uuid === uuid) {
        user = userData;
        break;
      }
    }

    if (!user) {
      return res.status(404).json({
        status: false,
        message: '用户不存在'
      });
    }

    res.status(200).json({
      status: true,
      message: '获取用户信息成功',
      data: {
        uuid: user.uuid,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email,
        created_at: user.created_at
      }
    });
  } catch (error) {
    log.error('获取用户详情失败:', error);
    res.status(500).json({
      status: false,
      message: '获取用户信息失败'
    });
  }
});

// 创建测试用户
app.post('/api/user/create-test-users', (req, res) => {
  try {
    const testUsers = [
      {
        phone: '13800138001',
        username: 'testuser1',
        nickname: '测试用户1',
        email: 'test1@example.com'
      },
      {
        phone: '13800138002',
        username: 'testuser2',
        nickname: '测试用户2',
        email: 'test2@example.com'
      }
    ];

    for (const userData of testUsers) {
      if (!users.has(userData.phone)) {
        const user = {
          id: Date.now() + Math.random(),
          uuid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          ...userData,
          avatar: '',
          status: 'active',
          created_at: new Date()
        };
        users.set(userData.phone, user);
        log.info(`创建测试用户: ${userData.phone}`);
      }
    }

    res.status(200).json({
      status: true,
      message: '测试用户创建成功'
    });
  } catch (error) {
    log.error('创建测试用户失败:', error);
    res.status(500).json({
      status: false,
      message: '创建测试用户失败'
    });
  }
});

// Socket.IO处理
io.on('connection', (socket) => {
  log.info(`Socket连接建立: ${socket.id}`);
  
  // 处理用户注册
  socket.on('register', (userData) => {
    const { uuid, phone } = userData;
    
    if (!uuid) {
      socket.emit('error', { message: '用户UUID不能为空' });
      return;
    }

    // 将用户添加到连接映射中
    connectedUsers.set(uuid, socket);
    socket.userUuid = uuid;
    socket.phone = phone;

    log.info(`用户注册成功: ${phone} (${uuid})`);

    // 发送欢迎消息
    socket.emit('welcome', {
      from: 'System',
      content: '欢迎来到漂流瓶世界！',
      type: 'system'
    });
  });

  // 处理心跳检测
  socket.on('ping', () => {
    socket.emit('pong');
  });

  socket.on('heartbeat', () => {
    socket.isAlive = true;
    socket.emit('heartbeat_ack');
  });

  // 处理断开连接
  socket.on('disconnect', (reason) => {
    log.info(`用户断开连接: ${socket.userUuid || socket.id}, 原因: ${reason}`);

    if (socket.userUuid) {
      connectedUsers.delete(socket.userUuid);
      log.info(`用户已从连接池移除: ${socket.userUuid}`);
    }
  });

  // 错误处理
  socket.on('error', (error) => {
    log.error(`Socket错误: ${socket.userUuid || socket.id}`, error);
  });
});

// 心跳检测机制
setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.isAlive && socket.userUuid) {
      log.info(`用户长时间无响应，断开连接: ${socket.userUuid}`);
      socket.disconnect();
    }
    socket.isAlive = false;
    socket.emit('ping');
  });
}, config.websocket.heartbeatInterval);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    status: false,
    message: '接口不存在'
  });
});

// 全局错误处理
app.use(globalErrorHandler);

// 启动服务器
const PORT = config.app.port;
const HOST = config.app.host;

server.listen(PORT, HOST, () => {
  log.info(`🚀 漂流瓶服务器启动成功!`);
  log.info(`📍 地址: http://${HOST}:${PORT}`);
  log.info(`🌍 环境: ${config.app.env}`);
  log.info(`🕐 时间: ${new Date().toLocaleString()}`);
});

// 优雅关闭
process.on('SIGTERM', () => {
  log.info('正在关闭服务器...');
  server.close(() => {
    log.info('服务器已成功关闭');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  log.info('正在关闭服务器...');
  server.close(() => {
    log.info('服务器已成功关闭');
    process.exit(0);
  });
});
