// API配置文件 - 统一管理所有API地址
const API_CONFIG = {
  // 基础配置
  BASE_URL: 'http://192.168.1.6:8889',
  
  // API端点
  ENDPOINTS: {
    // 健康检查
    HEALTH: '/health',
    
    // 用户相关
    USER: {
      LOGIN: '/api/user/login',
      REGISTER: '/api/user/register',
      CREATE_TEST_USERS: '/api/user/create-test-users',
      GET_USER: (uuid) => `/api/user/${uuid}`,
      UPDATE_USER: (uuid) => `/api/user/${uuid}`,
      SEARCH_USERS: '/api/user/search',
      ADD_FRIEND: '/api/user/add-friend',
      GET_FRIENDS: (uuid) => `/api/user/${uuid}/friends`,
    },
    
    // 漂流瓶相关
    BOTTLE: {
      THROW: '/api/bottle/throw',
      FISH: '/api/bottle/fish',
      GET_MY_BOTTLES: (uuid) => `/api/bottle/user/${uuid}`,
      REPLY: '/api/bottle/reply',
      THROW_BACK: '/api/bottle/throw-back',
    },
    
    // 积分和签到相关
    POINTS: {
      GET_INFO: '/api/points/info',
      CHECKIN: '/api/points/checkin',
      CHECKIN_HISTORY: '/api/points/checkin-history',
    },
    
    // 消息相关
    MESSAGE: {
      SEND: '/api/message/send',
      GET_CONVERSATION: (userId1, userId2) => `/api/message/conversation/${userId1}/${userId2}`,
      GET_CONVERSATIONS: (userId) => `/api/message/conversations/${userId}`,
      GET_MESSAGES: (conversationId) => `/api/message/${conversationId}`,
    },
    
    // 推送通知相关
    PUSH: {
      REGISTER_TOKEN: '/api/push/register-token',
      SEND_NOTIFICATION: '/api/push/send',
    },
    
    // WebSocket
    WEBSOCKET: 'ws://192.168.1.6:8889',
  },
  
  // 请求超时时间 (毫秒)
  TIMEOUT: 10000,
  
  // 默认请求头
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
  },
};

// 构建完整URL的辅助函数
export const buildUrl = (endpoint) => {
  if (typeof endpoint === 'function') {
    return endpoint;
  }
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// 获取WebSocket URL
export const getWebSocketUrl = () => {
  return API_CONFIG.ENDPOINTS.WEBSOCKET;
};

// 获取API基础URL
export const getBaseUrl = () => {
  return API_CONFIG.BASE_URL;
};

// 获取请求超时时间
export const getTimeout = () => {
  return API_CONFIG.TIMEOUT;
};

// 获取默认请求头
export const getDefaultHeaders = () => {
  return API_CONFIG.DEFAULT_HEADERS;
};

// 获取图片完整URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return '';
  
  // 如果已经是完整URL，直接返回
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // 否则拼接基础URL
  return `${API_CONFIG.BASE_URL}/uploads/${imagePath}`;
};

export default API_CONFIG;
