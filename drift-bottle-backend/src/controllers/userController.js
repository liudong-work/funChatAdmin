import userService from '../services/userService.js';
import { log } from '../config/logger.js';

/**
 * 统一的响应格式
 */
const createResponse = (res, status, success, message, data = null) => {
  return res.status(status).json({
    status: success,
    message,
    data
  });
};

export const userController = {
  /**
   * 用户注册
   * POST /api/user/register
   */
  async register(req, res, next) {
    try {
      const result = await userService.register(req.body);
      
      log.info(`用户注册成功: ${result.user.phone}`);
      return createResponse(res, 201, true, '注册成功', result);
    } catch (error) {
      log.error('用户注册失败:', error);
      return createResponse(res, 400, false, error.message);
    }
  },

  /**
   * 用户登录
   * POST /api/user/login
   */
  async login(req, res, next) {
    try {
      const { phone, verificationCode } = req.body;
      
      if (!phone || !verificationCode) {
        return createResponse(res, 400, false, '手机号和验证码不能为空');
      }

      const result = await userService.login(phone, verificationCode);
      
      log.info(`用户登录成功: ${result.user.phone}`);
      return createResponse(res, 200, true, '登录成功', result);
    } catch (error) {
      log.error('用户登录失败:', error);
      return createResponse(res, 400, false, error.message);
    }
  },

  /**
   * 获取用户详情
   * GET /api/user/:uuid
   */
  async getUserDetails(req, res, next) {
    try {
      const user = await userService.getUserDetails(req.params.uuid);
      
      return createResponse(res, 200, true, '获取用户信息成功', user);
    } catch (error) {
      log.error('获取用户详情失败:', error);
      return createResponse(res, 404, false, error.message);
    }
  },

  /**
   * 修改用户信息
   * PUT /api/user
   */
  async updateUserInfo(req, res, next) {
    try {
      const result = await userService.updateUserInfo(req.user.uuid, req.body);
      
      log.info(`用户信息修改成功: ${req.user.phone}`);
      return createResponse(res, 200, true, '修改成功', result);
    } catch (error) {
      log.error('修改用户信息失败:', error);
      return createResponse(res, 400, false, error.message);
    }
  },

  /**
   * 创建测试用户
   * POST /api/user/create-test-users
   */
  async createTestUsers(req, res, next) {
    try {
      await userService.createTestUsers();
      
      return createResponse(res, 200, true, '测试用户创建成功');
    } catch (error) {
      log.error('创建测试用户失败:', error);
      return createResponse(res, 500, false, error.message);
    }
  }
};
