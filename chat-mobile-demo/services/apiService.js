import API_CONFIG, { buildUrl, getTimeout, getDefaultHeaders } from '../config/api.js';

// API服务类 - 封装所有HTTP请求
class ApiService {
  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
    this.timeout = getTimeout();
    this.defaultHeaders = getDefaultHeaders();
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = typeof endpoint === 'function' ? endpoint() : buildUrl(endpoint);
    
    const config = {
      method: 'GET',
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // 添加超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // 前端调试日志：请求概要
      try {
        console.log('[API] request ->', {
          url,
          method: (config.method || 'GET'),
          headers: config.headers,
          bodyPreview: typeof config.body === 'string' ? config.body.slice(0, 200) : undefined,
        });
      } catch {}

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      let data = null;
      const text = await response.text();
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

      if (!response.ok) {
        const message = (data && data.message) ? data.message : `HTTP error! status: ${response.status}`;
        console.error('[API] response error <-', { url, status: response.status, message, data });
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      // 成功日志（可按需精简）
      try {
        console.log('[API] response <-', { url, status: response.status, ok: response.ok });
      } catch {}

      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('API请求失败:', error);
      throw error;
    }
  }

  // GET请求
  async get(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: 'GET',
      headers,
    });
  }

  // POST请求
  async post(endpoint, data = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
  }

  // PUT请求
  async put(endpoint, data = {}, headers = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    });
  }

  // DELETE请求
  async delete(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: 'DELETE',
      headers,
    });
  }

  // 文件上传请求
  async uploadFile(fileUri, token) {
    const formData = new FormData();
    
    // 创建文件对象
    const file = {
      uri: fileUri,
      type: 'image/jpeg',
      name: `image_${Date.now()}.jpg`,
    };
    
    formData.append('file', file);

    const response = await fetch(`${this.baseURL}/api/file`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        // 不要设置 Content-Type，让浏览器自动设置 multipart/form-data
      },
      body: formData,
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.message || '文件上传失败');
    }
    
    return data;
  }

  // 带认证的请求
  async authenticatedRequest(endpoint, options = {}, token) {
    const headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    };

    return this.request(endpoint, {
      ...options,
      headers,
    });
  }

  // 带认证的GET请求
  async authenticatedGet(endpoint, token, headers = {}) {
    return this.authenticatedRequest(endpoint, {
      method: 'GET',
      headers,
    }, token);
  }

  // 带认证的POST请求
  async authenticatedPost(endpoint, data = {}, token, headers = {}) {
    return this.authenticatedRequest(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    }, token);
  }

  // 带认证的PUT请求
  async authenticatedPut(endpoint, data = {}, token, headers = {}) {
    return this.authenticatedRequest(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(data),
    }, token);
  }

  // 带认证的DELETE请求
  async authenticatedDelete(endpoint, token, headers = {}) {
    return this.authenticatedRequest(endpoint, {
      method: 'DELETE',
      headers,
    }, token);
  }
}

// 创建API服务实例
const apiService = new ApiService();

// 用户相关API
export const userApi = {
  // 健康检查
  healthCheck: () => apiService.get(API_CONFIG.ENDPOINTS.HEALTH),

  // 创建测试用户
  createTestUsers: () => apiService.post(API_CONFIG.ENDPOINTS.USER.CREATE_TEST_USERS),

  // 发送验证码
  sendVerificationCode: (phone) => 
    apiService.post('/api/user/send-verification-code', {
      phone,
    }),

  // 用户登录
  login: (phone, verificationCode) => 
    apiService.post(API_CONFIG.ENDPOINTS.USER.LOGIN, {
      phone,
      verificationCode,
    }),

        // 用户注册
        register: (userData) => 
          apiService.post(API_CONFIG.ENDPOINTS.USER.REGISTER, userData),

        // 发布动态
        publishMoment: (momentData, token) => 
          apiService.authenticatedPost('/api/moment/publish', momentData, token),

        // 获取动态列表
        getMoments: (params = {}, token) => {
          const queryString = new URLSearchParams({
            page: params.page || 1,
            pageSize: params.pageSize || 10,
            status: params.status || 'approved',
            privacy: params.privacy || 'public'
          }).toString();
          return apiService.authenticatedGet(`/api/moment/list?${queryString}`, token);
        },

  // 获取用户信息
  getUser: (uuid, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.USER.GET_USER(uuid), token),

  // 更新用户信息
  updateUser: (uuid, userData, token) => 
    apiService.authenticatedPut(API_CONFIG.ENDPOINTS.USER.UPDATE_USER(uuid), userData, token),

  // 搜索用户
  searchUsers: (keyword, token) => 
    apiService.authenticatedGet(`${API_CONFIG.ENDPOINTS.USER.SEARCH_USERS}?keyword=${keyword}`, token),

  // 添加好友
  addFriend: (friendUuid, token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.USER.ADD_FRIEND, { friendUuid }, token),

  // 获取好友列表
  getFriends: (uuid, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.USER.GET_FRIENDS(uuid), token),
};

// 漂流瓶相关API (待实现)
export const bottleApi = {
  // 扔瓶子
  throwBottle: (content, mood, token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.BOTTLE.THROW, { content, mood }, token),

  // 捞瓶子
  fishBottle: (token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.BOTTLE.FISH, {}, token),

  // 获取我的瓶子
  getMyBottles: (uuid, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.BOTTLE.GET_MY_BOTTLES(uuid), token),

  // 回复瓶子
  replyBottle: (bottleId, reply, token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.BOTTLE.REPLY, { bottleId, reply }, token),
};

// 消息相关API
export const messageApi = {
  // 发送消息
  sendMessage: (receiverId, content, token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.MESSAGE.SEND, { receiverId, content }, token),

  // 获取对话
  getConversation: (userId1, userId2, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.MESSAGE.GET_CONVERSATION(userId1, userId2), token, {
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache'
    }),

  // 获取用户的消息列表（所有对话）
  getConversations: (userId, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.MESSAGE.GET_CONVERSATIONS(userId), token),

  // 获取消息列表
  getMessages: (conversationId, token) => 
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.MESSAGE.GET_MESSAGES(conversationId), token),
};

// 文件上传API（用于语音等多媒体）
export const fileApi = {
  async uploadFile(fileUri, fileName, mimeType, token) {
    try {
      console.log('[FileAPI] 开始上传文件:', { fileUri, fileName, mimeType, hasToken: !!token });
      
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: mimeType || 'application/octet-stream',
      });

      const url = buildUrl('/api/file');
      console.log('[FileAPI] 上传URL:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          // 不设置 Content-Type，让 fetch 自动设置
        },
        body: formData,
      });
      
      console.log('[FileAPI] 响应状态:', res.status, res.statusText);
      
      const text = await res.text();
      console.log('[FileAPI] 响应文本:', text);
      
      let data = null; 
      try { 
        data = text ? JSON.parse(text) : null; 
        console.log('[FileAPI] 解析后的数据:', data);
      } catch (e) {
        console.error('[FileAPI] JSON解析失败:', e);
      }
      
      return { ok: res.ok, status: res.status, data };
    } catch (e) {
      console.error('[FileAPI] 文件上传失败:', e);
      return { ok: false, status: 0, message: '文件上传失败' };
    }
  },
};

export default apiService;
