import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

export const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 8889,
    host: process.env.HOST || '0.0.0.0',
    version: '1.0.0'
  },
  database: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT) || 3306,
    name: process.env.DB_NAME || 'drift_bottle',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 20,
      min: parseInt(process.env.DB_POOL_MIN) || 5,
      acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 60000,
      idle: parseInt(process.env.DB_POOL_IDLE) || 30000,
      evict: parseInt(process.env.DB_POOL_EVICT) || 1000
    },
    handleDisconnects: process.env.DB_HANDLE_DISCONNECTS === 'true'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'drift_bottle_jwt_secret_key_2024',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads/',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB
  },
  oss: {
    region: process.env.OSS_REGION || 'oss-cn-beijing',
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET || 'mangguo001',
    endpoint: process.env.OSS_ENDPOINT || 'https://oss-cn-beijing.aliyuncs.com'
  },
  log: {
    level: process.env.LOG_LEVEL || 'debug',
    path: process.env.LOG_PATH || 'logs/drift-bottle.log'
  },
  websocket: {
    heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000
  }
};
