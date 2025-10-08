import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import formidable from 'formidable';
import path from 'path';
import fs from 'fs';

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
  },
  // 增加最大消息大小限制（10MB）
  maxHttpBufferSize: 10 * 1024 * 1024,
  // 增加 ping 超时时间
  pingTimeout: 60000,
  pingInterval: 25000
});

// 内存存储（临时方案）
const users = new Map();
const connectedUsers = new Map();
const bottles = [];
const conversations = new Map(); // 存储对话记录
const pushTokens = new Map(); // 存储用户推送令牌

// 创建上传目录
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 formidable
const uploadDir = uploadsDir;

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
// 兼容部分客户端发送 text/plain 的情况
app.use(express.text({ type: '*/*', limit: '10mb' }));

// 静态文件服务
app.use('/uploads', express.static(uploadsDir));

// 管理员路由
import adminRouter from './routes/admin.js';
app.use('/api/admin', adminRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: true,
    message: '漂流瓶服务器运行正常',
    timestamp: new Date().toISOString(),
    version: config.app.version
  });
});

// 文件上传接口 - 使用 formidable
app.post('/api/file', authenticateToken, async (req, res) => {
  console.log('[FileUpload] 收到文件上传请求');
  console.log('[FileUpload] 请求头:', req.headers);
  console.log('[FileUpload] Content-Type:', req.headers['content-type']);
  
  try {
    // 检查 Content-Type
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        status: false,
        message: 'Content-Type 必须是 multipart/form-data'
      });
    }

    // 配置 formidable - 简化配置，移除 filter
    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 10 * 1024 * 1024, // 10MB
    });

    // 解析表单数据
    const [fields, files] = await form.parse(req);
    console.log('[FileUpload] 解析结果:', { fields, files });

    // 检查是否有文件
    if (!files.file || !Array.isArray(files.file) || files.file.length === 0) {
      console.log('[FileUpload] 没有文件被上传');
      return res.status(400).json({
        status: false,
        message: '没有文件被上传'
      });
    }

    const file = files.file[0];
    console.log('[FileUpload] 文件信息:', file);

    // 生成新的文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = `file-${uniqueSuffix}${path.extname(file.originalFilename)}`;
    const newFilepath = path.join(uploadDir, filename);
    
    // 重命名文件
    fs.renameSync(file.filepath, newFilepath);
    console.log('[FileUpload] 文件已保存到:', newFilepath);
    
    const fileUrl = `/uploads/${filename}`;
    console.log('[FileUpload] 生成文件URL:', fileUrl);
    
    const response = {
      status: true,
      message: '文件上传成功',
      data: {
        filename: filename,
        originalname: file.originalFilename,
        url: fileUrl,
        size: file.size,
        mimetype: file.mimetype
      }
    };
    
    console.log('[FileUpload] 返回响应:', response);
    res.json(response);
  } catch (error) {
    console.error('[FileUpload] 文件上传失败:', error);
    res.status(500).json({
      status: false,
      message: `文件上传失败: ${error.message}`
    });
  }
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
    // 记录原始请求体，便于排查字段为空/类型不对
    console.log('[LOGIN] 请求体类型:', typeof req.body, 'Content-Type:', req.headers['content-type']);
    console.log('[LOGIN] 请求体原始:', req.body);

    // 若 body 是字符串，尝试解析为 JSON
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
        console.log('[LOGIN] 解析后的JSON:', req.body);
      } catch (e) {
        console.log('[LOGIN] JSON解析失败:', e.message);
      }
    }

    let { phone, verificationCode } = req.body || {};
    // 兜底：从query取值（部分客户端可能未正确发送JSON Body）
    if ((!phone || !verificationCode) && req.query) {
      phone = phone || req.query.phone;
      verificationCode = verificationCode || req.query.verificationCode || req.query.code;
      console.log('[LOGIN] 使用query兜底', { phone, verificationCode });
    }
    
    if (!phone || !verificationCode) {
      console.log('[LOGIN] 参数缺失', { phonePresent: !!phone, codePresent: !!verificationCode });
      return res.status(400).json({
        status: false,
        message: '手机号和验证码不能为空'
      });
    }

    // 查找用户
    let user = users.get(phone);
    if (!user) {
      // 未注册则自动注册一个默认账号
      const last4 = String(phone).slice(-4);
      user = {
        id: Date.now() + Math.random(),
        uuid: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        phone,
        username: `user_${last4}`,
        nickname: `用户${last4}`,
        email: '',
        avatar: '',
        status: 'active',
        created_at: new Date()
      };
      users.set(phone, user);
      console.log('[LOGIN] 自动注册并登录', { phone, uuid: user.uuid });
    }

    if (user.status !== 'active') {
      console.log('[LOGIN] 账户被禁用', { phone, status: user.status });
      return res.status(400).json({
        status: false,
        message: '账户已被禁用'
      });
    }

    // 验证码验证（简化处理）
    if (verificationCode !== '123456') {
      console.log('[LOGIN] 验证码错误', { phone, verificationCode });
      return res.status(400).json({
        status: false,
        message: '验证码错误'
      });
    }

    // 生成JWT令牌
    const token = generateToken(user);

    console.log('[LOGIN] 成功', { phone });

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

// 扔瓶子
app.post('/api/bottle/throw', authenticateToken, (req, res) => {
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

    const bottle = {
      id: Date.now() + Math.random(),
      uuid: `bottle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content: String(content).slice(0, 1000),
      mood: mood || '',
      sender_uuid: req.user.uuid,
      receiver_uuid: null,
      status: 'sea',
      created_at: new Date(),
      picked_at: null,
    };
    bottles.push(bottle);

    return res.status(201).json({
      status: true,
      message: '扔瓶子成功',
      data: {
        uuid: bottle.uuid,
        created_at: bottle.created_at,
      }
    });
  } catch (error) {
    console.log('[BOTTLE] throw error', error);
    return res.status(500).json({ status: false, message: '扔瓶子失败' });
  }
});

// 捞瓶子（随机捞一个非自己的且未被捞走的）
app.post('/api/bottle/fish', authenticateToken, (req, res) => {
  try {
    const myUuid = req.user.uuid;
    // 找到第一个在海里的且不是自己的瓶子
    const idx = bottles.findIndex(b => b.status === 'sea' && b.sender_uuid !== myUuid);
    if (idx === -1) {
      return res.status(200).json({ status: true, message: '当前海里没有可捞的瓶子' });
    }
    const bottle = bottles[idx];
    bottle.status = 'picked';
    bottle.receiver_uuid = myUuid;
    bottle.picked_at = new Date();

    // 将瓶子消息添加到对话历史中
    const conversationKey = [bottle.sender_uuid, myUuid].sort().join('|');
    if (!conversations.has(conversationKey)) {
      conversations.set(conversationKey, []);
    }
    
    // 创建瓶子消息
    const bottleMessage = {
      id: Date.now() + Math.random(),
      uuid: `bottle_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_uuid: bottle.sender_uuid,
      receiver_uuid: myUuid,
      content: bottle.content,
      status: 'bottle', // 标记为瓶子消息
      created_at: bottle.created_at, // 使用瓶子创建时间
      bottle_uuid: bottle.uuid, // 关联瓶子ID
    };
    
    conversations.get(conversationKey).push(bottleMessage);
    console.log(`[BOTTLE] 瓶子消息已添加到对话历史: ${conversationKey}`);

    // 返回精简字段
    return res.status(200).json({
      status: true,
      message: '捞到一个瓶子',
      data: {
        uuid: bottle.uuid,
        content: bottle.content,
        mood: bottle.mood,
        sender_uuid: bottle.sender_uuid,
        sender_nickname: `用户${bottle.sender_uuid.slice(-4)}`, // 添加发送者昵称
        picked_at: bottle.picked_at,
      }
    });
  } catch (error) {
    console.log('[BOTTLE] fish error', error);
    return res.status(500).json({ status: false, message: '捞瓶子失败' });
  }
});

// 发送消息
app.post('/api/message/send', authenticateToken, (req, res) => {
  try {
    // 兼容 text/plain 的 JSON 字符串
    let body = req.body;
    if (typeof body === 'string' && body.trim().startsWith('{')) {
      try { body = JSON.parse(body); } catch {}
    }
    const { receiverId, content } = body || {};

    if (!receiverId || !content || String(content).trim().length === 0) {
      return res.status(400).json({ status: false, message: '接收者和内容不能为空' });
    }

    const message = {
      id: Date.now() + Math.random(),
      uuid: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_uuid: req.user.uuid,
      receiver_uuid: receiverId,
      content: String(content).slice(0, 1000),
      status: 'sent',
      created_at: new Date(),
    };

    // 存储消息到对话记录
    const conversationKey = [req.user.uuid, receiverId].sort().join('|');
    if (!conversations.has(conversationKey)) {
      conversations.set(conversationKey, []);
    }
    conversations.get(conversationKey).push(message);

    // 通过WebSocket推送给接收者
  const receiverSocket = connectedUsers.get(receiverId);
  log.info(`[MSG] 推送准备 -> to: ${receiverId}, from: ${req.user.uuid}, hasSocket: ${!!receiverSocket}, onlineCount: ${connectedUsers.size}, conversationKey: ${conversationKey}`);
  if (receiverSocket) {
      receiverSocket.emit('new_message', {
        message: {
          id: message.id,
          uuid: message.uuid,
          sender_uuid: message.sender_uuid,
          receiver_uuid: message.receiver_uuid,
          content: message.content,
          created_at: message.created_at,
        },
        conversation_key: conversationKey,
      });
  } else {
    log.info(`[MSG] 接收者不在线，无法推送 -> ${receiverId}`);
    }

    return res.status(201).json({
      status: true,
      message: '消息发送成功',
      data: {
        uuid: message.uuid,
        created_at: message.created_at,
      }
    });
  } catch (error) {
    console.log('[MESSAGE] send error', error);
    return res.status(500).json({ status: false, message: '发送消息失败' });
  }
});

// 获取对话消息
app.get('/api/message/conversation/:user1/:user2', authenticateToken, (req, res) => {
  try {
    const { user1, user2 } = req.params;
    const conversationKey = [user1, user2].sort().join('|');
    const messages = conversations.get(conversationKey) || [];

    return res.status(200).json({
      status: true,
      message: '获取对话消息成功',
      data: {
        conversation_key: conversationKey,
        messages: messages.slice(-50), // 返回最近50条消息
      }
    });
  } catch (error) {
    console.log('[MESSAGE] get conversation error', error);
    return res.status(500).json({ status: false, message: '获取对话消息失败' });
  }
});

// 获取用户的消息列表（所有对话）
app.get('/api/message/conversations/:userId', authenticateToken, (req, res) => {
  try {
    const { userId } = req.params;
    const userConversations = [];

    // 遍历所有对话，找到包含该用户的对话
    for (const [conversationKey, messages] of conversations.entries()) {
      const [user1, user2] = conversationKey.split('|');
      
      if (user1 === userId || user2 === userId) {
        // 找到对话中的另一个用户
        const otherUserId = user1 === userId ? user2 : user1;
        
        // 获取最后一条消息
        const lastMessage = messages[messages.length - 1];
        
        if (lastMessage) {
          // 获取另一个用户的信息
          const otherUser = Array.from(users.values()).find(u => u.uuid === otherUserId);
          
          userConversations.push({
            conversation_key: conversationKey,
            other_user: {
              uuid: otherUserId,
              nickname: otherUser ? otherUser.nickname : `用户${otherUserId.slice(-4)}`,
              avatar: otherUser ? otherUser.avatar : '👤',
            },
            last_message: {
              content: lastMessage.content,
              created_at: lastMessage.created_at,
              sender_uuid: lastMessage.sender_uuid,
            },
            unread_count: 0, // 暂时设为0，后续可以实现未读消息计数
          });
        }
      }
    }

    // 按最后消息时间排序
    userConversations.sort((a, b) => new Date(b.last_message.created_at) - new Date(a.last_message.created_at));

    return res.status(200).json({
      status: true,
      message: '获取消息列表成功',
      data: {
        conversations: userConversations,
      }
    });
  } catch (error) {
    console.log('[MESSAGE] get conversations error', error);
    return res.status(500).json({ status: false, message: '获取消息列表失败' });
  }
});

// 注册推送令牌
app.post('/api/push/register-token', authenticateToken, (req, res) => {
  try {
    const { pushToken } = req.body;
    
    if (!pushToken) {
      return res.status(400).json({ status: false, message: '推送令牌不能为空' });
    }

    // 存储推送令牌
    pushTokens.set(req.user.uuid, pushToken);
    console.log(`[PUSH] 推送令牌注册成功: ${req.user.uuid}`);
    
    return res.status(200).json({
      status: true,
      message: '推送令牌注册成功'
    });
  } catch (error) {
    console.log('[PUSH] 注册推送令牌失败:', error);
    return res.status(500).json({ status: false, message: '注册推送令牌失败' });
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
    log.info(`[WS] 当前在线用户数: ${connectedUsers.size}`);

    // 发送欢迎消息
    socket.emit('welcome', {
      from: 'System',
      content: '欢迎来到漂流瓶世界！',
      type: 'system'
    });
  });

  // 处理语音消息
  socket.on('voice_message', (data) => {
    try {
      console.log('[WS] 收到语音消息:', {
        from: data.from,
        to: data.to,
        duration: data.duration,
        audioDataLength: data.audioData ? data.audioData.length : 0
      });

      const { from, to, audioData, duration, mimeType } = data;

      if (!from || !to || !audioData) {
        socket.emit('error', { message: '语音消息数据不完整' });
        return;
      }

      // 生成消息ID
      const messageId = `voice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // 保存语音消息到对话历史
      const conversationKey = [from, to].sort().join('|');
      if (!conversations.has(conversationKey)) {
        conversations.set(conversationKey, []);
      }

      const voiceMessage = {
        id: Date.now() + Math.random(),
        uuid: messageId,
        sender_uuid: from,
        receiver_uuid: to,
        content: '[语音消息]',
        type: 'voice',
        audioData: audioData, // 直接存储音频数据
        duration: duration || 0,
        mimeType: mimeType || 'audio/m4a',
        status: 'sent',
        created_at: new Date(),
      };

      conversations.get(conversationKey).push(voiceMessage);

      // 发送给接收者
      const receiverSocket = connectedUsers.get(to);
      if (receiverSocket) {
        receiverSocket.emit('voice_message', {
          message: {
            id: voiceMessage.id,
            uuid: voiceMessage.uuid,
            sender_uuid: voiceMessage.sender_uuid,
            receiver_uuid: voiceMessage.receiver_uuid,
            content: voiceMessage.content,
            type: voiceMessage.type,
            audioData: voiceMessage.audioData,
            duration: voiceMessage.duration,
            mimeType: voiceMessage.mimeType,
            created_at: voiceMessage.created_at,
          },
          conversation_key: conversationKey,
        });
        console.log('[WS] 语音消息已发送给接收者:', to);
      } else {
        console.log('[WS] 接收者不在线:', to);
      }

      // 发送确认给发送者
      socket.emit('voice_message_sent', {
        messageId: messageId,
        status: 'success'
      });

    } catch (error) {
      console.error('[WS] 处理语音消息失败:', error);
      socket.emit('error', { message: '语音消息处理失败' });
    }
  });

  // 处理图片消息（参考 go-chat 二进制直传思路）
  socket.on('image_message', (data) => {
    try {
      const { from, to, imageData, mimeType, width, height } = data || {};
      console.log('[WS] 收到图片消息:', {
        from,
        to,
        hasImageData: !!imageData,
        length: Array.isArray(imageData) ? imageData.length : 0,
        mimeType,
        width,
        height,
      });

      if (!from || !to || !imageData) {
        socket.emit('error', { message: '图片消息数据不完整' });
        return;
      }

      // 保存图片到 uploads 目录
      const extFromMime = (mimeType || 'image/png').split('/')[1] || 'png';
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filename = `img-${uniqueSuffix}.${extFromMime}`;
      const filepath = path.join(uploadsDir, filename);

      const buffer = Buffer.from(new Uint8Array(imageData));
      fs.writeFileSync(filepath, buffer);
      const fileUrl = `/uploads/${filename}`;

      // 组装消息并落库
      const messageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const conversationKey = [from, to].sort().join('|');
      if (!conversations.has(conversationKey)) {
        conversations.set(conversationKey, []);
      }
      const imgMessage = {
        id: Date.now() + Math.random(),
        uuid: messageId,
        sender_uuid: from,
        receiver_uuid: to,
        content: '[图片]',
        type: 'image',
        imageUrl: fileUrl,
        width: width || null,
        height: height || null,
        status: 'sent',
        created_at: new Date(),
      };
      conversations.get(conversationKey).push(imgMessage);

      // 推送给接收者
      const receiverSocket = connectedUsers.get(to);
      console.log('[WS] 图片消息推送准备:', {
        to,
        hasReceiverSocket: !!receiverSocket,
        onlineUsersCount: connectedUsers.size,
        imageUrl: fileUrl
      });
      
      if (receiverSocket) {
        receiverSocket.emit('image_message', {
          message: {
            id: imgMessage.id,
            uuid: imgMessage.uuid,
            sender_uuid: imgMessage.sender_uuid,
            receiver_uuid: imgMessage.receiver_uuid,
            content: imgMessage.content,
            type: imgMessage.type,
            imageUrl: imgMessage.imageUrl,
            width: imgMessage.width,
            height: imgMessage.height,
            created_at: imgMessage.created_at,
          },
          conversation_key: conversationKey,
        });
        console.log('[WS] 图片消息已推送给接收者:', to);
      } else {
        console.log('[WS] 接收者不在线，图片消息未推送:', to);
      }

      // 回执给发送者
      socket.emit('image_message_sent', {
        messageId,
        imageUrl: fileUrl,
        status: 'success',
      });
      console.log('[WS] 图片消息发送确认已返回给发送者');
    } catch (error) {
      console.error('[WS] 处理图片消息失败:', error);
      socket.emit('error', { message: '图片消息处理失败' });
    }
  });

  // ==================== WebRTC 语音通话信令处理 ====================
  
  // 处理通话请求（发起通话）
  socket.on('call_offer', (data) => {
    try {
      const { from, to, offer } = data;
      console.log('[WebRTC] 收到通话请求:', { from, to, hasOffer: !!offer });
      
      const receiverSocket = connectedUsers.get(to);
      if (receiverSocket) {
        receiverSocket.emit('call_offer', {
          from,
          to,
          offer,
          caller: data.caller, // 发起方信息
        });
        console.log('[WebRTC] 通话请求已转发给:', to);
      } else {
        // 接收方不在线
        socket.emit('call_failed', {
          reason: 'user_offline',
          message: '对方不在线',
        });
        console.log('[WebRTC] 接收方不在线:', to);
      }
    } catch (error) {
      console.error('[WebRTC] 处理通话请求失败:', error);
      socket.emit('error', { message: '通话请求处理失败' });
    }
  });
  
  // 处理通话应答（接受通话）
  socket.on('call_answer', (data) => {
    try {
      const { from, to, answer } = data;
      console.log('[WebRTC] 收到通话应答:', { from, to, hasAnswer: !!answer });
      
      const callerSocket = connectedUsers.get(to);
      if (callerSocket) {
        callerSocket.emit('call_answer', {
          from,
          to,
          answer,
        });
        console.log('[WebRTC] 通话应答已转发给:', to);
      }
    } catch (error) {
      console.error('[WebRTC] 处理通话应答失败:', error);
    }
  });
  
  // 处理 ICE 候选者交换
  socket.on('ice_candidate', (data) => {
    try {
      const { from, to, candidate } = data;
      console.log('[WebRTC] 收到 ICE 候选者:', { from, to, hasCandidate: !!candidate });
      
      const targetSocket = connectedUsers.get(to);
      if (targetSocket) {
        targetSocket.emit('ice_candidate', {
          from,
          to,
          candidate,
        });
        console.log('[WebRTC] ICE 候选者已转发给:', to);
      }
    } catch (error) {
      console.error('[WebRTC] 处理 ICE 候选者失败:', error);
    }
  });
  
  // 处理拒绝通话
  socket.on('call_reject', (data) => {
    try {
      const { from, to } = data;
      console.log('[WebRTC] 收到拒绝通话:', { from, to });
      
      const callerSocket = connectedUsers.get(to);
      if (callerSocket) {
        callerSocket.emit('call_reject', {
          from,
          to,
        });
        console.log('[WebRTC] 拒绝通话已通知给:', to);
      }
    } catch (error) {
      console.error('[WebRTC] 处理拒绝通话失败:', error);
    }
  });
  
  // 处理挂断通话
  socket.on('call_hangup', (data) => {
    try {
      const { from, to } = data;
      console.log('[WebRTC] 收到挂断通话:', { from, to });
      
      const targetSocket = connectedUsers.get(to);
      if (targetSocket) {
        targetSocket.emit('call_hangup', {
          from,
          to,
        });
        console.log('[WebRTC] 挂断通话已通知给:', to);
      }
    } catch (error) {
      console.error('[WebRTC] 处理挂断通话失败:', error);
    }
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

// 心跳检测机制 - 更宽松的检测
setInterval(() => {
  io.sockets.sockets.forEach((socket) => {
    if (!socket.isAlive && socket.userUuid) {
      // 给用户更多时间响应，不要立即断开
      log.info(`用户长时间无响应，但保持连接: ${socket.userUuid}`);
      // socket.disconnect(); // 暂时不强制断开
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

server.listen(PORT, '0.0.0.0', () => {
  log.info(`🚀 漂流瓶服务器启动成功!`);
  log.info(`📍 地址: http://0.0.0.0:${PORT}`);
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
