import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import formidable from 'formidable';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 导入配置
import { config } from './config/config.js';
import { log } from './config/logger.js';

// 导入中间件
import { corsConfig, requestLogger, globalErrorHandler } from './middleware/cors.js';

// 导入服务
import verificationService from './services/verificationService.js';
import { uploadToOSS, uploadBufferToOSS, checkOSSConfig, deleteFromOSS } from './services/ossService.js';

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
const follows = new Map(); // 存储关注关系 Map<follower_uuid, Set<following_uuid>>
const userPoints = new Map(); // 存储用户积分 Map<user_uuid, {points, total_points, continuous_days, last_checkin_date}>
const checkinRecords = new Map(); // 存储签到记录 Map<user_uuid, Set<checkin_date>>

// 管理员账号（临时方案）
const admins = new Map();
admins.set('admin', {
  id: 'admin_001',
  username: 'admin',
  password: 'admin123', // 实际项目中应该加密
  role: 'admin',
  createdAt: new Date().toISOString()
});
admins.set('test', {
  id: 'admin_002', 
  username: 'test',
  password: 'test123',
  role: 'admin',
  createdAt: new Date().toISOString()
});

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

// 动态路由
import momentRouter, { setGlobalFollows } from './routes/moment.js';
// 设置全局关注数据
setGlobalFollows(follows);
app.use('/api/moment', momentRouter);

// 管理员登录接口（必须在通用admin路由之前）
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

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: true,
    message: '漂流瓶服务器运行正常',
    timestamp: new Date().toISOString(),
    version: config.app.version
  });
});

// 管理员路由（在login接口之后）
import adminRouter, { setGlobalUsers } from './routes/admin.js';
import adminMomentRouter from './routes/adminMoment.js';
app.use('/api/admin', adminRouter);
app.use('/api/admin/moments', adminMomentRouter);

// 设置全局用户存储引用
setGlobalUsers(users);

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

// OSS配置检查API
app.get('/api/upload/oss/config', (req, res) => {
  console.log('[OSSConfig] 检查OSS配置');
  
  if (!checkOSSConfig()) {
    console.error('[OSSConfig] OSS配置不完整');
    return res.status(500).json({
      status: false,
      message: 'OSS配置不完整，请检查环境变量'
    });
  }
  
  console.log('[OSSConfig] OSS配置正常');
  return res.json({
    status: true,
    message: 'OSS配置正常',
    data: {
      region: process.env.OSS_REGION,
      bucket: process.env.OSS_BUCKET,
      endpoint: process.env.OSS_ENDPOINT,
      hasAccessKey: !!process.env.OSS_ACCESS_KEY_ID,
      hasSecret: !!process.env.OSS_ACCESS_KEY_SECRET
    }
  });
});

// OSS上传API - 使用Base64编码方式，使用Express内置body解析器
app.post('/api/upload/oss', authenticateToken, async (req, res) => {
  console.log('[OSS上传] 收到上传请求');
  console.log('[OSS上传] Content-Type:', req.headers['content-type']);
  console.log('[OSS上传] Content-Length:', req.headers['content-length']);
  
  try {
    // 检查OSS配置
    if (!checkOSSConfig()) {
      console.error('[OSS上传] OSS配置不完整');
      return res.status(500).json({
        status: false,
        message: 'OSS配置不完整，请检查环境变量'
      });
    }

    // 使用Express内置的JSON解析器
    console.log('[OSS上传] 开始解析请求体...');
    console.log('[OSS上传] req.body类型:', typeof req.body);
    console.log('[OSS上传] req.body内容:', req.body ? Object.keys(req.body) : 'undefined');
    
    const { fileData, fileName, fileType } = req.body;
    
    if (!fileData || !fileName) {
      console.log('[OSS上传] 缺少必要参数:', { hasFileData: !!fileData, hasFileName: !!fileName });
      return res.status(400).json({
        status: false,
        message: '缺少文件数据或文件名'
      });
    }

    console.log('[OSS上传] 文件信息:', { 
      fileName, 
      fileType, 
      dataLength: fileData ? fileData.length : 0 
    });

    // 将Base64转换为Buffer
    const fileBuffer = Buffer.from(fileData, 'base64');
    console.log('[OSS上传] Buffer大小:', fileBuffer.length, 'bytes');

    // 生成临时文件
    const ext = path.extname(fileName);
    const tempFileName = `temp_${Date.now()}${ext}`;
    const tempFilePath = path.join(uploadDir, tempFileName);
    
    fs.writeFileSync(tempFilePath, fileBuffer);
    console.log('[OSS上传] 临时文件已创建:', tempFilePath);

    // 生成OSS对象名称
    const ossObjectName = `uploads/upload_${Date.now()}_${Math.floor(Math.random() * 1000000)}${ext}`;
    
    console.log('[OSS上传] 开始上传到OSS:', ossObjectName);
    
    // 上传到OSS
    const ossResult = await uploadToOSS(tempFilePath, ossObjectName);
    
    // 删除临时文件
    fs.unlinkSync(tempFilePath);
    console.log('[OSS上传] 临时文件已删除');
    
    if (ossResult.success) {
      console.log('[OSS上传] 上传成功:', ossResult.url);
      
      return res.json({
        status: true,
        message: '上传成功',
        data: {
          filename: ossResult.name,
          url: ossResult.url,
          size: ossResult.size,
          type: 'oss'
        }
      });
    } else {
      console.error('[OSS上传] OSS上传失败:', ossResult.error);
      return res.status(500).json({
        status: false,
        message: 'OSS上传失败: ' + (ossResult.error || '未知错误')
      });
    }
    
  } catch (error) {
    console.error('[OSS上传] 处理失败:', error);
    return res.status(500).json({
      status: false,
      message: '上传失败: ' + error.message
    });
  }
});

// 头像上传API (OSS存储) - 使用multer处理
app.post('/api/user/avatar/oss', authenticateToken, (req, res) => {
  console.log('[AvatarUpload] 收到头像上传请求');
  
  // 检查OSS配置
  if (!checkOSSConfig()) {
    console.error('[AvatarUpload] OSS配置不完整');
    return res.status(500).json({
      status: false,
      message: 'OSS配置不完整，请检查环境变量'
    });
  }

  // 设置请求超时
  req.setTimeout(30000); // 30秒超时

  // 使用multer内存存储处理文件上传
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
    fileFilter: function (req, file, cb) {
      // 只允许图片文件
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('只允许上传图片文件'), false);
      }
    }
  });

  // 处理单个文件上传，字段名为 'avatar'
  upload.single('avatar')(req, res, async (err) => {
    try {
      if (err) {
        console.error('[AvatarUpload] 文件上传失败:', err);
        return res.status(400).json({
          status: false,
          message: err.message || '文件上传失败'
        });
      }

      if (!req.file) {
        console.error('[AvatarUpload] 未找到文件');
        return res.status(400).json({
          status: false,
          message: '请选择头像文件'
        });
      }

      console.log('[AvatarUpload] 文件信息:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        bufferSize: req.file.buffer ? req.file.buffer.length : 0
      });

      // 获取用户信息
      const user = users.get(req.user.uuid);
      if (!user) {
        console.error('[AvatarUpload] 用户不存在:', req.user.uuid);
        return res.status(404).json({
          status: false,
          message: '用户不存在'
        });
      }
      
      // 生成OSS对象名称
      const ext = path.extname(req.file.originalname) || '.jpg';
      const ossObjectName = `avatars/avatar_${user.uuid}_${Date.now()}${ext}`;
      
      console.log('[AvatarUpload] 开始上传到OSS:', ossObjectName);
      
      // 使用内存缓冲区上传到OSS
      const ossResult = await uploadBufferToOSS(req.file.buffer, ossObjectName);
      
      if (ossResult.success) {
        // 删除旧头像文件（如果是OSS文件）
        if (user.avatar && user.avatar.includes('oss-cn-beijing.aliyuncs.com')) {
          try {
            const oldObjectName = user.avatar.split('/').slice(-2).join('/');
            await deleteFromOSS(oldObjectName);
            console.log('[AvatarUpload] 删除旧头像文件:', oldObjectName);
          } catch (deleteErr) {
            console.warn('[AvatarUpload] 删除旧头像文件失败:', deleteErr.message);
          }
        }
        
        // 更新用户头像URL
        user.avatar = ossResult.url;
        
        console.log('[AvatarUpload] 头像上传成功:', user.uuid, '->', ossResult.url);
        
        return res.json({
          status: true,
          message: '头像上传成功',
          data: {
            avatar: ossResult.url,
            filename: ossResult.name,
            size: ossResult.size,
            type: 'oss'
          }
        });
      } else {
        console.error('[AvatarUpload] OSS上传失败:', ossResult.error);
        return res.status(500).json({
          status: false,
          message: '头像上传失败: ' + (ossResult.error || '未知错误')
        });
      }
      
    } catch (error) {
      console.error('[AvatarUpload] 处理失败:', error);
      
      return res.status(500).json({
        status: false,
        message: '头像上传失败: ' + error.message
      });
    }
  });
});

// 发送验证码
app.post('/api/user/send-verification-code', (req, res) => {
  try {
    const { phone } = req.body;
    
    if (!phone) {
      return res.status(400).json({
        status: false,
        message: '手机号不能为空'
      });
    }

    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        status: false,
        message: '请输入正确的手机号'
      });
    }

    // 发送验证码
    const result = verificationService.sendVerificationCode(phone);
    
    log.info(`验证码发送请求: 手机号=${phone}`);
    
    res.status(200).json({
      status: true,
      message: result.message,
      data: {
        expiresIn: result.expiresIn,
        // 开发环境返回验证码，生产环境不返回
        ...(process.env.NODE_ENV === 'development' && { code: result.code })
      }
    });
  } catch (error) {
    log.error('发送验证码失败:', error);
    res.status(500).json({
      status: false,
      message: '发送验证码失败'
    });
  }
});

// 用户注册
app.post('/api/user/register', (req, res) => {
  try {
    const { phone, username, nickname, email, verificationCode } = req.body;
    
    if (!phone || !verificationCode) {
      return res.status(400).json({
        status: false,
        message: '手机号和验证码不能为空'
      });
    }

    // 验证验证码
    if (!verificationService.verifyCode(phone, verificationCode)) {
      return res.status(400).json({
        status: false,
        message: '验证码错误或已过期'
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
      created_at: new Date(),
      lastLogin: new Date()
    };

    users.set(phone, user);

    // 生成JWT令牌
    const token = generateToken(user);

    log.info(`用户注册成功: ${phone} (${user.nickname})`);

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

    // 验证验证码
    if (!verificationService.verifyCode(phone, verificationCode)) {
      console.log('[LOGIN] 验证码错误', { phone, code: verificationCode });
      return res.status(400).json({
        status: false,
        message: '验证码错误或已过期'
      });
    }

    // 查找用户
    let user = users.get(phone);
    if (!user) {
      return res.status(400).json({
        status: false,
        message: '手机号未注册，请先注册'
      });
    }

    if (user.status !== 'active') {
      console.log('[LOGIN] 账户被禁用', { phone, status: user.status });
      return res.status(400).json({
        status: false,
        message: '账户已被禁用'
      });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();

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

// 检查海里的瓶子
app.get('/api/bottle/check', authenticateToken, (req, res) => {
  try {
    const myUuid = req.user.uuid;
    
    // 找到海里所有不是自己的瓶子
    const availableBottles = bottles.filter(b => 
      b.status === 'sea' && b.sender_uuid !== myUuid
    ).slice(0, 3); // 最多返回3个瓶子

    return res.status(200).json({
      status: true,
      message: availableBottles.length > 0 ? '海里有瓶子' : '海里没有瓶子',
      data: {
        bottles: availableBottles.map(bottle => ({
          uuid: bottle.uuid,
          content: bottle.content,
          mood: bottle.mood,
          sender_uuid: bottle.sender_uuid,
          created_at: bottle.created_at,
        })),
        count: availableBottles.length
      }
    });
  } catch (error) {
    console.log('[BOTTLE] check error', error);
    return res.status(500).json({ status: false, message: '检查瓶子失败' });
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

// ==================== 关注功能 API ====================

// 关注/取消关注用户
app.post('/api/follow/:target_uuid', authenticateToken, (req, res) => {
  try {
    const { target_uuid } = req.params;
    const follower_uuid = req.user.uuid;

    if (!target_uuid) {
      return res.status(400).json({
        status: false,
        message: '目标用户UUID不能为空'
      });
    }

    // 不能关注自己
    if (follower_uuid === target_uuid) {
      return res.status(400).json({
        status: false,
        message: '不能关注自己'
      });
    }

    // 检查目标用户是否存在
    const targetUser = Array.from(users.values()).find(u => u.uuid === target_uuid);
    if (!targetUser) {
      log.error(`目标用户不存在: ${target_uuid}`);
      log.error(`当前用户列表: ${Array.from(users.values()).map(u => ({ phone: u.phone, uuid: u.uuid }))}`);
      return res.status(404).json({
        status: false,
        message: '目标用户不存在'
      });
    }

    // 获取关注列表
    if (!follows.has(follower_uuid)) {
      follows.set(follower_uuid, new Set());
    }

    const followingSet = follows.get(follower_uuid);
    const isFollowing = followingSet.has(target_uuid);

    if (isFollowing) {
      // 取消关注
      followingSet.delete(target_uuid);
      log.info(`用户取消关注: ${follower_uuid} -> ${target_uuid}`);
      
      return res.json({
        status: true,
        message: '取消关注成功',
        data: {
          is_following: false,
          followers_count: getFollowersCount(target_uuid),
          following_count: followingSet.size
        }
      });
    } else {
      // 关注
      followingSet.add(target_uuid);
      log.info(`用户关注: ${follower_uuid} -> ${target_uuid}`);
      
      return res.json({
        status: true,
        message: '关注成功',
        data: {
          is_following: true,
          followers_count: getFollowersCount(target_uuid),
          following_count: followingSet.size
        }
      });
    }
  } catch (error) {
    log.error('关注/取消关注失败:', error);
    return res.status(500).json({
      status: false,
      message: '操作失败'
    });
  }
});

// 获取关注列表
app.get('/api/follow/following/:user_uuid?', authenticateToken, (req, res) => {
  try {
    const user_uuid = req.params.user_uuid || req.user.uuid;
    const { page = 1, pageSize = 20 } = req.query;

    const followingSet = follows.get(user_uuid) || new Set();
    const followingList = Array.from(followingSet);

    // 分页
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedList = followingList.slice(startIndex, endIndex);

    // 获取用户详情
    const followingUsers = paginatedList.map(uuid => {
      const user = Array.from(users.values()).find(u => u.uuid === uuid);
      return user ? {
        uuid: user.uuid,
        phone: user.phone,
        username: user.username || user.phone,
        nickname: user.phone || `用户${user.id}`,
        avatar: '👤',
        is_following: true,
        followers_count: getFollowersCount(uuid)
      } : null;
    }).filter(Boolean);

    return res.json({
      status: true,
      data: {
        list: followingUsers,
        total: followingList.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(followingList.length / parseInt(pageSize))
      }
    });
  } catch (error) {
    log.error('获取关注列表失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取关注列表失败'
    });
  }
});

// 获取粉丝列表
app.get('/api/follow/followers/:user_uuid?', authenticateToken, (req, res) => {
  try {
    const user_uuid = req.params.user_uuid || req.user.uuid;
    const { page = 1, pageSize = 20 } = req.query;
    const current_user_uuid = req.user.uuid;

    // 找出所有关注了该用户的人
    const followersList = [];
    for (const [follower, followingSet] of follows.entries()) {
      if (followingSet.has(user_uuid)) {
        followersList.push(follower);
      }
    }

    // 分页
    const startIndex = (parseInt(page) - 1) * parseInt(pageSize);
    const endIndex = startIndex + parseInt(pageSize);
    const paginatedList = followersList.slice(startIndex, endIndex);

    // 获取用户详情
    const followersUsers = paginatedList.map(uuid => {
      const user = Array.from(users.values()).find(u => u.uuid === uuid);
      const currentUserFollowingSet = follows.get(current_user_uuid) || new Set();
      return user ? {
        uuid: user.uuid,
        phone: user.phone,
        username: user.username || user.phone,
        nickname: user.phone || `用户${user.id}`,
        avatar: '👤',
        is_following: currentUserFollowingSet.has(uuid),
        followers_count: getFollowersCount(uuid)
      } : null;
    }).filter(Boolean);

    return res.json({
      status: true,
      data: {
        list: followersUsers,
        total: followersList.length,
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalPages: Math.ceil(followersList.length / parseInt(pageSize))
      }
    });
  } catch (error) {
    log.error('获取粉丝列表失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取粉丝列表失败'
    });
  }
});

// 检查关注状态
app.get('/api/follow/status/:target_uuid', authenticateToken, (req, res) => {
  try {
    const { target_uuid } = req.params;
    const follower_uuid = req.user.uuid;

    const followingSet = follows.get(follower_uuid) || new Set();
    const is_following = followingSet.has(target_uuid);

    return res.json({
      status: true,
      data: {
        is_following,
        followers_count: getFollowersCount(target_uuid),
        following_count: followingSet.size
      }
    });
  } catch (error) {
    log.error('检查关注状态失败:', error);
    return res.status(500).json({
      status: false,
      message: '检查关注状态失败'
    });
  }
});

// 辅助函数：获取用户的粉丝数
function getFollowersCount(user_uuid) {
  let count = 0;
  for (const followingSet of follows.values()) {
    if (followingSet.has(user_uuid)) {
      count++;
    }
  }
  return count;
}

// ==================== 积分和签到相关API ====================

// 获取用户积分信息
app.get('/api/points/info', authenticateToken, (req, res) => {
  try {
    const userUuid = req.user.uuid;
    
    // 获取或创建用户积分记录
    let points = userPoints.get(userUuid);
    if (!points) {
      points = {
        points: 0,
        total_points: 0,
        continuous_days: 0,
        last_checkin_date: null
      };
      userPoints.set(userUuid, points);
    }
    
    // 检查今天是否已签到
    const today = new Date().toISOString().split('T')[0];
    const userCheckins = checkinRecords.get(userUuid) || new Set();
    const isCheckedInToday = userCheckins.has(today);
    
    return res.status(200).json({
      status: true,
      data: {
        points: points.points,
        total_points: points.total_points,
        continuous_days: points.continuous_days,
        last_checkin_date: points.last_checkin_date,
        is_checked_in_today: isCheckedInToday
      }
    });
  } catch (error) {
    log.error('获取积分信息失败:', error);
    return res.status(500).json({ status: false, message: '获取积分信息失败' });
  }
});

// 每日签到
app.post('/api/points/checkin', authenticateToken, (req, res) => {
  try {
    const userUuid = req.user.uuid;
    const today = new Date().toISOString().split('T')[0];
    
    // 获取用户签到记录
    let userCheckins = checkinRecords.get(userUuid);
    if (!userCheckins) {
      userCheckins = new Set();
      checkinRecords.set(userUuid, userCheckins);
    }
    
    // 检查今天是否已签到
    if (userCheckins.has(today)) {
      return res.status(400).json({ 
        status: false, 
        message: '今天已经签到过了' 
      });
    }
    
    // 获取或创建用户积分记录
    let points = userPoints.get(userUuid);
    if (!points) {
      points = {
        points: 0,
        total_points: 0,
        continuous_days: 0,
        last_checkin_date: null
      };
      userPoints.set(userUuid, points);
    }
    
    // 计算连续签到天数
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    let continuousDays = 1;
    if (points.last_checkin_date === yesterdayStr) {
      // 连续签到
      continuousDays = points.continuous_days + 1;
    }
    
    // 计算签到获得的积分（基础积分5，连续签到额外奖励）
    let pointsEarned = 5;
    let bonusMessage = '';
    
    if (continuousDays >= 7) {
      pointsEarned += 10; // 连续7天额外10积分
      bonusMessage = '连续签到7天奖励！';
    } else if (continuousDays >= 3) {
      pointsEarned += 5; // 连续3天额外5积分
      bonusMessage = '连续签到3天奖励！';
    }
    
    // 更新用户积分
    points.points += pointsEarned;
    points.total_points += pointsEarned;
    points.continuous_days = continuousDays;
    points.last_checkin_date = today;
    
    // 记录签到
    userCheckins.add(today);
    
    log.info(`[CHECKIN] 用户 ${userUuid} 签到成功，连续${continuousDays}天，获得${pointsEarned}积分`);
    
    return res.status(200).json({
      status: true,
      message: '签到成功',
      data: {
        points_earned: pointsEarned,
        continuous_days: continuousDays,
        total_points: points.total_points,
        bonus_message: bonusMessage
      }
    });
  } catch (error) {
    log.error('签到失败:', error);
    return res.status(500).json({ status: false, message: '签到失败' });
  }
});

// 获取签到历史
app.get('/api/points/checkin-history', authenticateToken, (req, res) => {
  try {
    const userUuid = req.user.uuid;
    const { page = 1, limit = 20 } = req.query;
    
    const userCheckins = checkinRecords.get(userUuid) || new Set();
    const checkinList = Array.from(userCheckins).sort((a, b) => b.localeCompare(a));
    
    // 分页
    const startIndex = (parseInt(page) - 1) * parseInt(limit);
    const endIndex = startIndex + parseInt(limit);
    const paginatedList = checkinList.slice(startIndex, endIndex);
    
    const history = paginatedList.map(date => ({
      checkin_date: date,
      points_earned: 5, // 简化处理，实际应该存储具体积分
      continuous_days: 1 // 简化处理
    }));
    
    return res.status(200).json({
      status: true,
      data: {
        history,
        total: checkinList.length,
        page: parseInt(page),
        limit: parseInt(limit)
      }
    });
  } catch (error) {
    log.error('获取签到历史失败:', error);
    return res.status(500).json({ status: false, message: '获取签到历史失败' });
  }
});

// ==================== 漂流瓶完整生命周期API ====================

// 获取我的瓶子
app.get('/api/bottle/user/:uuid', authenticateToken, (req, res) => {
  try {
    const { uuid } = req.params;
    const myUuid = req.user.uuid;
    
    // 只能查看自己的瓶子
    if (uuid !== myUuid) {
      return res.status(403).json({ status: false, message: '无权查看其他用户的瓶子' });
    }
    
    // 找到该用户的所有瓶子
    const userBottles = bottles.filter(b => b.sender_uuid === myUuid);
    
    return res.status(200).json({
      status: true,
      data: {
        bottles: userBottles.map(bottle => ({
          uuid: bottle.uuid,
          content: bottle.content,
          mood: bottle.mood,
          status: bottle.status,
          receiver_uuid: bottle.receiver_uuid,
          created_at: bottle.created_at,
          picked_at: bottle.picked_at
        })),
        count: userBottles.length
      }
    });
  } catch (error) {
    console.log('[BOTTLE] get my bottles error', error);
    return res.status(500).json({ status: false, message: '获取我的瓶子失败' });
  }
});

// 回复瓶子
app.post('/api/bottle/reply', authenticateToken, (req, res) => {
  try {
    const { bottleId, reply } = req.body;
    const myUuid = req.user.uuid;
    
    if (!bottleId || !reply) {
      return res.status(400).json({ status: false, message: '瓶子ID和回复内容不能为空' });
    }
    
    // 找到瓶子
    const bottle = bottles.find(b => b.uuid === bottleId);
    if (!bottle) {
      return res.status(404).json({ status: false, message: '瓶子不存在' });
    }
    
    // 检查权限（只有捞到瓶子的人才能回复）
    if (bottle.receiver_uuid !== myUuid) {
      return res.status(403).json({ status: false, message: '无权回复此瓶子' });
    }
    
    // 创建回复消息并添加到对话历史
    const conversationKey = [bottle.sender_uuid, myUuid].sort().join('|');
    if (!conversations.has(conversationKey)) {
      conversations.set(conversationKey, []);
    }
    
    const replyMessage = {
      id: Date.now() + Math.random(),
      uuid: `reply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sender_uuid: myUuid,
      receiver_uuid: bottle.sender_uuid,
      content: reply,
      status: 'sent',
      created_at: new Date(),
      bottle_uuid: bottle.uuid,
      type: 'bottle_reply'
    };
    
    conversations.get(conversationKey).push(replyMessage);
    
    return res.status(201).json({
      status: true,
      message: '回复成功',
      data: {
        uuid: replyMessage.uuid,
        created_at: replyMessage.created_at
      }
    });
  } catch (error) {
    console.log('[BOTTLE] reply error', error);
    return res.status(500).json({ status: false, message: '回复瓶子失败' });
  }
});

// 扔回海里
app.post('/api/bottle/throw-back', authenticateToken, (req, res) => {
  try {
    const { bottleUuid } = req.body;
    const myUuid = req.user.uuid;
    
    if (!bottleUuid) {
      return res.status(400).json({ status: false, message: '瓶子UUID不能为空' });
    }
    
    // 找到瓶子
    const bottle = bottles.find(b => b.uuid === bottleUuid);
    if (!bottle) {
      return res.status(404).json({ status: false, message: '瓶子不存在' });
    }
    
    // 检查权限（只有捞到瓶子的人才能扔回海里）
    if (bottle.receiver_uuid !== myUuid) {
      return res.status(403).json({ status: false, message: '无权操作此瓶子' });
    }
    
    // 重置瓶子状态
    bottle.status = 'sea';
    bottle.receiver_uuid = null;
    bottle.picked_at = null;
    
    return res.status(200).json({
      status: true,
      message: '瓶子已扔回海里',
      data: {
        uuid: bottle.uuid,
        status: bottle.status
      }
    });
  } catch (error) {
    console.log('[BOTTLE] throw back error', error);
    return res.status(500).json({ status: false, message: '扔回海里失败' });
  }
});

// ==================== 用户相关API ====================

// 更新用户信息
app.put('/api/user/:uuid', authenticateToken, (req, res) => {
  try {
    const { uuid } = req.params;
    const myUuid = req.user.uuid;
    
    // 只能更新自己的信息
    if (uuid !== myUuid) {
      return res.status(403).json({ status: false, message: '无权更新其他用户信息' });
    }
    
    // 找到用户
    const user = Array.from(users.values()).find(u => u.uuid === uuid);
    if (!user) {
      return res.status(404).json({ status: false, message: '用户不存在' });
    }
    
    // 更新用户信息
    const { nickname, email } = req.body;
    if (nickname) user.nickname = nickname;
    if (email) user.email = email;
    
    return res.status(200).json({
      status: true,
      message: '更新成功',
      data: {
        uuid: user.uuid,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email
      }
    });
  } catch (error) {
    log.error('更新用户信息失败:', error);
    return res.status(500).json({ status: false, message: '更新用户信息失败' });
  }
});

// 搜索用户
app.get('/api/user/search', authenticateToken, (req, res) => {
  try {
    const { keyword } = req.query;
    
    if (!keyword || keyword.trim().length < 2) {
      return res.status(400).json({ status: false, message: '搜索关键词至少需要2个字符' });
    }
    
    const searchResults = Array.from(users.values())
      .filter(user => 
        user.phone.includes(keyword) || 
        user.nickname.includes(keyword) ||
        user.username.includes(keyword)
      )
      .slice(0, 20) // 限制结果数量
      .map(user => ({
        uuid: user.uuid,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar
      }));
    
    return res.status(200).json({
      status: true,
      data: {
        users: searchResults,
        count: searchResults.length
      }
    });
  } catch (error) {
    log.error('搜索用户失败:', error);
    return res.status(500).json({ status: false, message: '搜索用户失败' });
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

    // 确保用户在users Map中存在（如果不存在则创建）
    if (!users.has(phone)) {
      const user = {
        id: Date.now(),
        uuid: uuid,
        phone,
        username: phone,
        nickname: `用户${phone.slice(-4)}`,
        email: '',
        avatar: '',
        status: 'active',
        created_at: new Date(),
        lastLogin: new Date()
      };
      users.set(phone, user);
      log.info(`WebSocket连接时创建用户记录: ${phone} (${uuid})`);
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
