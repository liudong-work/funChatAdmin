import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 导入配置和数据库
import { config } from './config/config.js';
import { initDatabase } from './models/index.js';
import { log } from './config/logger.js';

// 导入中间件
import { corsConfig, requestLogger, globalErrorHandler } from './middleware/cors.js';

// 导入路由
import userRoutes from './routes/user.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class DriftBottleServer {
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    this.connectedUsers = new Map(); // 存储在线用户
  }

  async initialize() {
    try {
      // 初始化数据库
      await initDatabase();
      
      // 设置中间件
      this.setupMiddleware();
      
      // 设置路由
      this.setupRoutes();
      
      // 设置Socket.IO处理
      this.setupSocketHandlers();
      
      // 错误处理中间件
      this.setupErrorHandling();
      
      // 启动服务器
      this.start();
      
    } catch (error) {
      log.error('服务器初始化失败:', error);
      process.exit(1);
    }
  }

  setupMiddleware() {
    // 安全中间件
    this.app.use(helmet());
    
    // 压缩中间件
    this.app.use(compression());
    
    // CORS中间件
    this.app.use(corsConfig);
    
    // 请求日志
    this.app.use(requestLogger);
    
    // 限流中间件
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15分钟
      max: 100, // 限制每个IP 15分钟内最多100个请求
      message: {
        status: false,
        message: '请求过于频繁，请稍后再试'
      }
    });
    this.app.use('/api', limiter);
    
    // 解析JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  setupRoutes() {
    // 健康检查
    this.app.get('/health', (req, res) => {
      res.json({
        status: true,
        message: '漂流瓶服务器运行正常',
        timestamp: new Date().toISOString(),
        version: config.app.version
      });
    });
    
    // API路由
    this.app.use('/api', userRoutes);
    
    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        status: false,
        message: '接口不存在'
      });
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      log.info(`Socket连接建立: ${socket.id}`);
      
      // 处理用户注册
      socket.on('register', (userData) => {
        const { uuid, phone } = userData;
        
        if (!uuid) {
          socket.emit('error', { message: '用户UUID不能为空' });
          return;
        }

        // 将用户添加到连接映射中
        this.connectedUsers.set(uuid, socket);
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
          this.connectedUsers.delete(socket.userUuid);
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
      this.io.sockets.sockets.forEach((socket) => {
        if (!socket.isAlive && socket.userUuid) {
          log.info(`用户长时间无响应，断开连接: ${socket.userUuid}`);
          socket.disconnect();
        }
        socket.isAlive = false;
        socket.emit('ping');
      });
    }, config.websocket.heartbeatInterval);
  }

  setupErrorHandling() {
    // 全局错误处理
    this.app.use(globalErrorHandler);
    
    // Socket.IO错误处理
    this.io.on('error', (error) => {
      log.error('Socket.IO错误:', error);
    });
  }

  start() {
    const PORT = config.app.port;
    const HOST = config.app.host;
    
    this.server.listen(PORT, HOST, () => {
      log.info(`🚀 漂流瓶服务器启动成功!`);
      log.info(`📍 地址: http://${HOST}:${PORT}`);
      log.info(`🌍 环境: ${config.app.env}`);
      log.info(`🕐 时间: ${new Date().toLocaleString()}`);
    });
    
    // 优雅关闭
    process.on('SIGTERM', () => this.gracefulShutdown());
    process.on('SIGINT', () => this.gracefulShutdown());
  }

  gracefulShutdown() {
    log.info('正在关闭服务器...');
    
    this.server.close((err) => {
      if (err) {
        log.error('服务器关闭时发生错误:', err);
        process.exit(1);
      }
      
      log.info('服务器已成功关闭');
      process.exit(0);
    });
  }
}

// 启动服务器
const server = new DriftBottleServer();
server.initialize();
