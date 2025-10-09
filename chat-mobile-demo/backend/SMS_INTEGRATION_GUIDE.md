# 短信服务接入指南

## 当前状态

目前验证码系统使用**固定验证码 `123456`**，方便开发和测试。

## 短信服务提供商推荐

### 1. 阿里云短信服务
- **官网**: https://www.aliyun.com/product/sms
- **特点**: 
  - 到达率高，稳定性好
  - 价格合理（约0.045元/条）
  - API文档完善
  - 支持多种签名和模板

### 2. 腾讯云短信服务
- **官网**: https://cloud.tencent.com/product/sms
- **特点**:
  - 性价比高
  - 接入简单
  - 新用户有免费额度

### 3. 网易云信
- **官网**: https://netease.im/
- **特点**:
  - 专注IM和短信
  - 开发者友好
  - 有免费试用

## 接入步骤

### 步骤1: 注册并获取凭证

以阿里云为例：
1. 注册阿里云账号
2. 开通短信服务
3. 申请短信签名和模板
4. 获取 AccessKey ID 和 AccessKey Secret

### 步骤2: 安装SDK

```bash
cd backend
npm install @alicloud/pop-core --save
# 或者使用腾讯云
npm install tencentcloud-sdk-nodejs --save
```

### 步骤3: 创建短信服务

创建文件 `backend/src/services/smsService.js`:

```javascript
import Core from '@alicloud/pop-core';
import { log } from '../config/logger.js';

class SmsService {
  constructor() {
    // 从环境变量读取配置
    this.client = new Core({
      accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
      endpoint: 'https://dysmsapi.aliyuncs.com',
      apiVersion: '2017-05-25'
    });
    
    this.signName = process.env.SMS_SIGN_NAME; // 短信签名
    this.templateCode = process.env.SMS_TEMPLATE_CODE; // 短信模板
  }

  /**
   * 发送验证码短信
   * @param {string} phone - 手机号
   * @param {string} code - 验证码
   */
  async sendVerificationCode(phone, code) {
    try {
      const params = {
        PhoneNumbers: phone,
        SignName: this.signName,
        TemplateCode: this.templateCode,
        TemplateParam: JSON.stringify({ code })
      };

      const result = await this.client.request('SendSms', params, {
        method: 'POST'
      });

      if (result.Code === 'OK') {
        log.info(`短信发送成功: 手机号=${phone}`);
        return { success: true, message: '短信发送成功' };
      } else {
        log.error(`短信发送失败: ${result.Message}`);
        return { success: false, message: result.Message };
      }
    } catch (error) {
      log.error('短信发送异常:', error);
      return { success: false, message: '短信发送失败' };
    }
  }
}

export default new SmsService();
```

### 步骤4: 修改验证码服务

修改 `backend/src/services/verificationService.js`:

```javascript
import { log } from '../config/logger.js';
import smsService from './smsService.js'; // 导入短信服务

// 内存存储验证码（生产环境应该使用Redis）
const verificationCodes = new Map();

// 固定验证码（开发环境使用，方便测试）
const FIXED_CODE = '123456';
const USE_FIXED_CODE = process.env.USE_FIXED_CODE === 'true'; // 通过环境变量控制

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
  async sendVerificationCode(phone) {
    try {
      // 根据环境变量决定使用固定验证码还是随机验证码
      const code = USE_FIXED_CODE ? FIXED_CODE : this.generateCode();
      
      // 存储验证码，设置5分钟过期
      verificationCodes.set(phone, {
        code,
        expiresAt: Date.now() + 5 * 60 * 1000,
        attempts: 0,
        sentAt: new Date()
      });

      // 如果不使用固定验证码，则调用短信服务
      if (!USE_FIXED_CODE) {
        const smsResult = await smsService.sendVerificationCode(phone, code);
        if (!smsResult.success) {
          throw new Error('短信发送失败');
        }
      }
      
      log.info(`验证码已生成: 手机号=${phone}, 验证码=${code}${USE_FIXED_CODE ? '（固定验证码）' : ''}`);
      
      return {
        success: true,
        message: '验证码已发送',
        // 开发环境返回验证码，生产环境不返回
        code: USE_FIXED_CODE ? code : undefined,
        expiresIn: 300
      };
    } catch (error) {
      log.error('发送验证码失败:', error);
      throw new Error('发送验证码失败');
    }
  }

  // ... 其他方法保持不变
}

export default new VerificationService();
```

### 步骤5: 配置环境变量

在 `backend/.env` 文件中添加：

```env
# 验证码配置
USE_FIXED_CODE=true  # 开发环境设为true，生产环境设为false

# 阿里云短信配置（生产环境使用）
ALIYUN_ACCESS_KEY_ID=your_access_key_id
ALIYUN_ACCESS_KEY_SECRET=your_access_key_secret
SMS_SIGN_NAME=your_sign_name
SMS_TEMPLATE_CODE=your_template_code
```

### 步骤6: 短信模板示例

在短信服务提供商平台申请模板，示例：

```
【您的应用名】您的验证码是${code}，5分钟内有效，请勿泄露给他人。
```

## 测试流程

### 开发环境测试（固定验证码）
```bash
# 设置环境变量
export USE_FIXED_CODE=true

# 启动服务
cd backend && node src/server-simple.js

# 测试发送验证码
curl -X POST http://localhost:8889/api/user/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138001"}'

# 使用验证码 123456 进行注册/登录
```

### 生产环境测试（真实短信）
```bash
# 设置环境变量
export USE_FIXED_CODE=false
export ALIYUN_ACCESS_KEY_ID=your_key
export ALIYUN_ACCESS_KEY_SECRET=your_secret
export SMS_SIGN_NAME=your_sign
export SMS_TEMPLATE_CODE=your_template

# 启动服务
cd backend && node src/server-simple.js

# 测试发送验证码（会发送真实短信）
curl -X POST http://localhost:8889/api/user/send-verification-code \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138001"}'
```

## 成本估算

- **阿里云**: 约 0.045元/条
- **腾讯云**: 约 0.055元/条
- **网易云信**: 有免费额度，超出后约 0.05元/条

**每日1000条短信**：
- 月成本: 1000 × 30 × 0.045 = 1350元

## 安全建议

1. **防刷机制**: 同一手机号60秒内只能发送一次
2. **IP限制**: 同一IP每天最多发送N次
3. **验证码有效期**: 5分钟
4. **尝试次数限制**: 最多3次
5. **监控告警**: 异常发送量告警

## 当前代码位置

- 验证码服务: `backend/src/services/verificationService.js`
- 发送接口: `backend/src/server-simple.js` (POST /api/user/send-verification-code)
- 注册接口: `backend/src/server-simple.js` (POST /api/user/register)
- 登录接口: `backend/src/server-simple.js` (POST /api/user/login)

## 注意事项

1. **不要提交密钥到Git**: 使用 .env 文件，并加入 .gitignore
2. **生产环境不返回验证码**: 只在开发环境返回验证码
3. **日志脱敏**: 生产环境日志不要打印完整手机号和验证码
4. **短信模板审核**: 需要提前申请并通过审核
5. **费用监控**: 设置费用告警，防止被刷

