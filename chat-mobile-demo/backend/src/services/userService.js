import bcrypt from 'bcryptjs';
import { User } from '../models/index.js';
import { generateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';

class UserService {
  /**
   * 用户注册（手机号注册）
   */
  async register(userData) {
    try {
      // 检查手机号是否已存在
      const existingUser = await User.findOne({
        where: { phone: userData.phone }
      });

      if (existingUser) {
        throw new Error('手机号已注册');
      }

      // 创建用户（手机号注册不需要密码）
      const user = await User.create({
        phone: userData.phone,
        username: userData.username || userData.phone,
        nickname: userData.nickname || `用户${userData.phone.slice(-4)}`,
        email: userData.email,
        avatar: '', // 默认头像为空
        status: 'active'
      });

      // 生成JWT令牌
      const token = generateToken(user);

      return {
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
      };
    } catch (error) {
      log.error('用户注册失败:', error);
      throw error;
    }
  }

  /**
   * 用户登录（手机号登录）
   */
  async login(phone, verificationCode) {
    try {
      // 查找用户
      const user = await User.findOne({
        where: { phone }
      });

      if (!user) {
        throw new Error('手机号未注册');
      }

      if (user.status !== 'active') {
        throw new Error('账户已被禁用');
      }

      // 验证码验证（这里简化处理，实际应该集成短信服务）
      if (verificationCode !== '123456') {
        throw new Error('验证码错误');
      }

      // 生成JWT令牌
      const token = generateToken(user);

      return {
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
      };
    } catch (error) {
      log.error('用户登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户详情
   */
  async getUserDetails(uuid) {
    try {
      const user = await User.findOne({
        where: { uuid },
        attributes: ['uuid', 'phone', 'username', 'nickname', 'avatar', 'email', 'created_at']
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      return user;
    } catch (error) {
      log.error('获取用户详情失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  async updateUserInfo(uuid, updateData) {
    try {
      const user = await User.findOne({
        where: { uuid }
      });

      if (!user) {
        throw new Error('用户不存在');
      }

      // 更新数据
      const updateFields = {};
      if (updateData.username) updateFields.username = updateData.username;
      if (updateData.nickname) updateFields.nickname = updateData.nickname;
      if (updateData.email) updateFields.email = updateData.email;
      if (updateData.avatar) updateFields.avatar = updateData.avatar;

      await user.update(updateFields);

      return {
        id: user.id,
        uuid: user.uuid,
        phone: user.phone,
        username: user.username,
        nickname: user.nickname,
        avatar: user.avatar,
        email: user.email
      };
    } catch (error) {
      log.error('修改用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 创建测试用户
   */
  async createTestUsers() {
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
        const existingUser = await User.findOne({
          where: { phone: userData.phone }
        });

        if (!existingUser) {
          await User.create({
            ...userData,
            avatar: '',
            status: 'active'
          });
          log.info(`创建测试用户: ${userData.phone}`);
        }
      }

      return true;
    } catch (error) {
      log.error('创建测试用户失败:', error);
      throw error;
    }
  }
}

export default new UserService();
