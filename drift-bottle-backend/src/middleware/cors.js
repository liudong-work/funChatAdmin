import cors from 'cors';
import { log } from '../config/logger.js';

// CORS配置
export const corsConfig = cors({
  origin: function (origin, callback) {
    // 允许所有来源（开发环境）
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // 生产环境可以配置特定域名
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:8080',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:8080'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('不允许的CORS来源'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
});

// 请求日志中间件
export const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    log.info(`${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
};

// 错误处理中间件
export const errorHandler = (err, req, res, next) => {
  log.error('请求错误:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    status: false,
    message: '服务器内部错误'
  });
};

// 全局错误处理
export const globalErrorHandler = (err, req, res, next) => {
  log.error('全局错误:', err);
  
  res.status(err.status || 500).json({
    status: false,
    message: err.message || '服务器错误'
  });
};
