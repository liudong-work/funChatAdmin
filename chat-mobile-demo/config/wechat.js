// 微信支付配置文件
export const WECHAT_CONFIG = {
  // 商户号（你提供的）
  mchId: '1689876208',
  
  // 微信支付配置信息
  appId: 'wxcc16329714308cc9', // 你的AppID
  apiKey: '82a0d2a86ddadaf9c4b9934928cf205d', // 你的API密钥
  
  // 回调地址
  notifyUrl: 'https://your-domain.com/api/payment/wechat/notify',
  
  // 其他配置
  tradeType: 'APP', // 移动应用支付
  signType: 'MD5', // 签名类型
  
  // 开发环境配置
  development: {
    mchId: '1689876208', // 沙箱商户号（如果有的话）
    apiKey: 'sandbox_api_key', // 沙箱API密钥
    notifyUrl: 'https://your-domain.com/api/payment/wechat/sandbox/notify'
  }
};

// 支付场景配置
export const PAYMENT_SCENARIOS = {
  // 积分充值
  COIN_RECHARGE: {
    name: '积分充值',
    description: '购买金币用于应用内消费'
  },
  
  // 会员订阅
  MEMBERSHIP: {
    name: '会员订阅',
    description: '开通会员享受更多特权'
  },
  
  // 虚拟商品
  VIRTUAL_GOODS: {
    name: '虚拟商品',
    description: '购买头像框、表情包等虚拟商品'
  }
};

// 商品配置
export const PRODUCTS = {
  // 积分充值套餐
  COIN_PACKAGES: [
    { id: 1, name: '100金币', price: 1, coins: 100, bonus: 0 },
    { id: 2, name: '550金币', price: 5, coins: 550, bonus: 50 },
    { id: 3, name: '1200金币', price: 10, coins: 1200, bonus: 200 },
    { id: 4, name: '2500金币', price: 20, coins: 2500, bonus: 500 },
    { id: 5, name: '6500金币', price: 50, coins: 6500, bonus: 1500 },
    { id: 6, name: '14000金币', price: 100, coins: 14000, bonus: 4000 }
  ],
  
  // 会员套餐
  MEMBERSHIP_PLANS: [
    { 
      id: 1, 
      name: '月度会员', 
      price: 18, 
      duration: 30, 
      features: ['无广告', '专属头像框', '优先客服'],
      description: '享受30天会员特权'
    },
    { 
      id: 2, 
      name: '季度会员', 
      price: 48, 
      duration: 90, 
      features: ['无广告', '专属头像框', '优先客服', '专属表情包'],
      description: '享受90天会员特权'
    },
    { 
      id: 3, 
      name: '年度会员', 
      price: 168, 
      duration: 365, 
      features: ['无广告', '专属头像框', '优先客服', '专属表情包', '专属主题'],
      description: '享受365天会员特权'
    }
  ],
  
  // 虚拟商品
  VIRTUAL_GOODS: [
    { id: 1, name: '专属头像框', price: 6, type: 'avatar_frame', description: '独特的头像装饰' },
    { id: 2, name: '表情包套装', price: 12, type: 'emoji_pack', description: '丰富的聊天表情' },
    { id: 3, name: '主题皮肤', price: 8, type: 'theme', description: '个性化界面主题' },
    { id: 4, name: '聊天背景', price: 3, type: 'chat_background', description: '个性化聊天背景' }
  ]
};

export default WECHAT_CONFIG;
