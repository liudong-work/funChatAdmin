import express from 'express';
import { userController } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 用户注册 - 不需要认证
router.post('/user/register', userController.register);

// 用户登录 - 不需要认证
router.post('/user/login', userController.login);

// 创建测试用户 - 不需要认证（仅开发环境）
router.post('/user/create-test-users', userController.createTestUsers);

// 获取用户详情 - 需要认证
router.get('/user/:uuid', authenticateToken, userController.getUserDetails);

// 修改用户信息 - 需要认证
router.put('/user', authenticateToken, userController.updateUserInfo);

export default router;
