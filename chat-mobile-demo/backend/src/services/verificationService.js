import { log } from '../config/logger.js';

// 内存存储验证码（生产环境应该使用Redis）
const verificationCodes = new Map();

// 固定验证码（开发环境使用，方便测试）
const FIXED_CODE = '123456';

class VerificationService {
  /**
   * 生成6位数字验证码
   */
  generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * 发送验证码
   * @param {string} phone - 手机号
   * @returns {string} 验证码
   */
  sendVerificationCode(phone) {
    try {
      // 开发环境使用固定验证码，方便测试
      // 生产环境接入短信服务后，改为调用短信API
      const code = FIXED_CODE;
      
      // 存储验证码，设置5分钟过期
      verificationCodes.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟后过期
        attempts: 0, // 验证尝试次数
        sentAt: new Date()
      });

      // TODO: 接入短信服务
      // 生产环境示例：
      // const smsResult = await smsService.send(phone, code);
      // if (!smsResult.success) {
      //   throw new Error('短信发送失败');
      // }
      
      log.info(`验证码已生成: 手机号=${phone}, 验证码=${code}（固定验证码，方便测试）`);
      
      return {
        success: true,
        message: '验证码已发送',
        code: code, // 开发环境返回验证码，生产环境不返回
        expiresIn: 300 // 5分钟
      };
    } catch (error) {
      log.error('发送验证码失败:', error);
      throw new Error('发送验证码失败');
    }
  }

  /**
   * 验证验证码
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   * @returns {boolean} 验证结果
   */
  verifyCode(phone, code) {
    try {
      const verificationData = verificationCodes.get(phone);
      
      if (!verificationData) {
        log.warn(`验证码不存在: 手机号=${phone}`);
        return false;
      }

      // 检查是否过期
      if (Date.now() > verificationData.expiresAt) {
        verificationCodes.delete(phone);
        log.warn(`验证码已过期: 手机号=${phone}`);
        return false;
      }

      // 检查尝试次数（最多3次）
      if (verificationData.attempts >= 3) {
        verificationCodes.delete(phone);
        log.warn(`验证码尝试次数过多: 手机号=${phone}`);
        return false;
      }

      // 验证码匹配检查
      if (verificationData.code === code) {
        // 验证成功后删除验证码
        verificationCodes.delete(phone);
        log.info(`验证码验证成功: 手机号=${phone}`);
        return true;
      } else {
        // 增加尝试次数
        verificationData.attempts++;
        log.warn(`验证码错误: 手机号=${phone}, 尝试次数=${verificationData.attempts}`);
        return false;
      }
    } catch (error) {
      log.error('验证验证码失败:', error);
      return false;
    }
  }

  /**
   * 清理过期验证码
   */
  cleanExpiredCodes() {
    const now = Date.now();
    for (const [phone, data] of verificationCodes.entries()) {
      if (now > data.expiresAt) {
        verificationCodes.delete(phone);
        log.debug(`清理过期验证码: 手机号=${phone}`);
      }
    }
  }

  /**
   * 获取验证码统计信息（用于管理后台）
   */
  getVerificationStats() {
    const now = Date.now();
    const active = Array.from(verificationCodes.entries()).filter(
      ([phone, data]) => now <= data.expiresAt
    ).length;
    
    return {
      total: verificationCodes.size,
      active,
      expired: verificationCodes.size - active
    };
  }
}

// 定期清理过期验证码
setInterval(() => {
  new VerificationService().cleanExpiredCodes();
}, 60000); // 每分钟清理一次

export default new VerificationService();
