import winston from 'winston';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';

// 确保日志目录存在
const logDir = path.dirname(config.log.path);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// 创建日志格式
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// 创建控制台格式
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// 创建logger实例
export const log = winston.createLogger({
  level: config.log.level,
  format: logFormat,
  transports: [
    // 文件日志
    new winston.transports.File({
      filename: config.log.path,
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // 错误日志单独文件
    new winston.transports.File({
      filename: config.log.path.replace('.log', '-error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// 开发环境添加控制台输出
if (config.app.env === 'development') {
  log.add(new winston.transports.Console({
    format: consoleFormat
  }));
}

export default log;
