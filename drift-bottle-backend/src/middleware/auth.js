import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';
import { log } from '../config/logger.js';

// 生成JWT token
export const generateToken = (user) => {
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
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    log.error('Token验证失败:', error);
    return null;
  }
};

// 认证中间件
export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

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
