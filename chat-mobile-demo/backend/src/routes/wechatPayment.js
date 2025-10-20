import express from 'express';
import crypto from 'crypto';
import { authenticateToken } from '../middleware/auth.js';
import { User, Order } from '../models/index.js';
import { log } from '../config/logger.js';

const router = express.Router();

// 微信支付配置
const WECHAT_CONFIG = {
  appId: process.env.WECHAT_APP_ID || 'wxcc16329714308cc9',
  mchId: process.env.WECHAT_MCH_ID || '1689876208',
  apiKey: process.env.WECHAT_API_KEY || '82a0d2a86ddadaf9c4b9934928cf205d',
  notifyUrl: process.env.WECHAT_NOTIFY_URL || 'https://your-domain.com/api/payment/wechat/notify'
};

/**
 * 生成随机字符串
 */
function generateNonceStr() {
  return Math.random().toString(36).substr(2, 15);
}

/**
 * 生成微信支付签名
 */
function generateWechatSign(params) {
  // 过滤空值并排序
  const filteredParams = Object.keys(params)
    .filter(key => params[key] !== '' && params[key] !== null && params[key] !== undefined)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});

  // 构建签名字符串
  const stringA = Object.keys(filteredParams)
    .map(key => `${key}=${filteredParams[key]}`)
    .join('&');

  const stringSignTemp = `${stringA}&key=${WECHAT_CONFIG.apiKey}`;
  
  // MD5签名
  return crypto.createHash('md5').update(stringSignTemp).digest('hex').toUpperCase();
}

/**
 * 创建微信支付订单
 */
router.post('/create-order', authenticateToken, async (req, res) => {
  try {
    const { productId, productType, amount, description, userId } = req.body;
    const currentUser = req.user;

    // 生成订单号
    const orderId = `WX${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // 创建订单记录
    const order = await Order.create({
      orderId,
      userId: currentUser.id,
      productId,
      productType,
      amount,
      description,
      status: 'pending',
      paymentMethod: 'wechat',
      createdAt: new Date()
    });

    // 构建微信支付参数
    const nonceStr = generateNonceStr();
    const timeStamp = Math.floor(Date.now() / 1000).toString();

    const payParams = {
      appid: WECHAT_CONFIG.appId,
      mch_id: WECHAT_CONFIG.mchId,
      nonce_str: nonceStr,
      body: description || '商品购买',
      out_trade_no: orderId,
      total_fee: Math.round(amount * 100), // 转换为分
      spbill_create_ip: req.ip || '127.0.0.1',
      notify_url: WECHAT_CONFIG.notifyUrl,
      trade_type: 'APP'
    };

    // 生成签名
    payParams.sign = generateWechatSign(payParams);

    // 这里应该调用微信统一下单API
    // 为了演示，我们返回模拟的prepay_id
    const prepayId = `prepay_id=wx${Date.now()}${Math.random().toString(36).substr(2, 9)}`;

    // 构建客户端支付参数
    const clientParams = {
      appid: WECHAT_CONFIG.appId,
      partnerid: WECHAT_CONFIG.mchId,
      prepayid: prepayId,
      package: 'Sign=WXPay',
      noncestr: nonceStr,
      timestamp: timeStamp
    };

    // 生成客户端签名
    clientParams.sign = generateWechatSign(clientParams);

    log.info(`[微信支付] 创建订单成功: ${orderId}`);

    res.json({
      status: true,
      message: '订单创建成功',
      data: {
        orderId,
        amount,
        prepayId: clientParams.prepayid,
        nonceStr: clientParams.noncestr,
        timeStamp: clientParams.timestamp,
        sign: clientParams.sign
      }
    });
  } catch (error) {
    log.error('[微信支付] 创建订单失败:', error);
    res.status(500).json({
      status: false,
      message: '创建订单失败: ' + error.message
    });
  }
});

/**
 * 微信支付回调
 */
router.post('/notify', async (req, res) => {
  try {
    const callbackData = req.body;
    log.info('[微信支付] 收到回调:', callbackData);

    // 验证签名
    const sign = callbackData.sign;
    delete callbackData.sign;
    
    const calculatedSign = generateWechatSign(callbackData);
    
    if (sign !== calculatedSign) {
      log.error('[微信支付] 签名验证失败');
      return res.send('FAIL');
    }

    // 检查支付结果
    if (callbackData.return_code === 'SUCCESS' && callbackData.result_code === 'SUCCESS') {
      const orderId = callbackData.out_trade_no;
      const transactionId = callbackData.transaction_id;
      const totalFee = parseInt(callbackData.total_fee) / 100; // 转换为元

      // 更新订单状态
      await Order.update(
        {
          status: 'paid',
          transactionId,
          paidAt: new Date(),
          updatedAt: new Date()
        },
        {
          where: { orderId }
        }
      );

      // 处理业务逻辑（如发放金币、开通会员等）
      await handlePaymentSuccess(orderId, totalFee);

      log.info(`[微信支付] 支付成功: ${orderId}`);
      res.send('SUCCESS');
    } else {
      log.error('[微信支付] 支付失败:', callbackData);
      res.send('FAIL');
    }
  } catch (error) {
    log.error('[微信支付] 处理回调失败:', error);
    res.send('FAIL');
  }
});

/**
 * 查询支付状态
 */
router.get('/query/:orderId', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({
      where: { orderId }
    });

    if (!order) {
      return res.status(404).json({
        status: false,
        message: '订单不存在'
      });
    }

    res.json({
      status: true,
      data: {
        orderId: order.orderId,
        status: order.status,
        amount: order.amount,
        createdAt: order.createdAt,
        paidAt: order.paidAt
      }
    });
  } catch (error) {
    log.error('[微信支付] 查询订单失败:', error);
    res.status(500).json({
      status: false,
      message: '查询订单失败: ' + error.message
    });
  }
});

/**
 * 获取支付历史
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { page = 1, pageSize = 20 } = req.query;
    const currentUser = req.user;

    const orders = await Order.findAndCountAll({
      where: {
        userId: currentUser.id,
        paymentMethod: 'wechat'
      },
      order: [['createdAt', 'DESC']],
      limit: parseInt(pageSize),
      offset: (parseInt(page) - 1) * parseInt(pageSize)
    });

    res.json({
      status: true,
      data: {
        orders: orders.rows,
        total: orders.count,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    log.error('[微信支付] 获取支付历史失败:', error);
    res.status(500).json({
      status: false,
      message: '获取支付历史失败: ' + error.message
    });
  }
});

/**
 * 处理支付成功后的业务逻辑
 */
async function handlePaymentSuccess(orderId, amount) {
  try {
    const order = await Order.findOne({
      where: { orderId },
      include: [{ model: User, as: 'user' }]
    });

    if (!order) {
      log.error(`[微信支付] 订单不存在: ${orderId}`);
      return;
    }

    // 根据商品类型处理业务逻辑
    switch (order.productType) {
      case 'COIN_PACKAGES':
        // 发放金币
        const coins = order.productId === 1 ? 100 : 
                     order.productId === 2 ? 550 :
                     order.productId === 3 ? 1200 :
                     order.productId === 4 ? 2500 :
                     order.productId === 5 ? 6500 : 14000;
        
        await User.update(
          { 
            points: order.user.points + coins,
            updatedAt: new Date()
          },
          { where: { id: order.userId } }
        );
        
        log.info(`[微信支付] 发放金币: 用户${order.userId} 获得${coins}金币`);
        break;

      case 'MEMBERSHIP':
        // 开通会员
        const duration = order.productId === 1 ? 30 :
                        order.productId === 2 ? 90 : 365;
        
        const expireDate = new Date();
        expireDate.setDate(expireDate.getDate() + duration);
        
        await User.update(
          {
            membershipType: 'premium',
            membershipExpire: expireDate,
            updatedAt: new Date()
          },
          { where: { id: order.userId } }
        );
        
        log.info(`[微信支付] 开通会员: 用户${order.userId} 会员${duration}天`);
        break;

      case 'VIRTUAL_GOODS':
        // 发放虚拟商品
        // 这里可以根据商品类型处理
        log.info(`[微信支付] 发放虚拟商品: 用户${order.userId} 商品${order.productId}`);
        break;

      default:
        log.warn(`[微信支付] 未知商品类型: ${order.productType}`);
    }
  } catch (error) {
    log.error('[微信支付] 处理支付成功业务逻辑失败:', error);
  }
}

export default router;
