import API_CONFIG, { buildUrl, getBaseUrl, getTimeout, getDefaultHeaders } from '../config/api.js';

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

        // 点赞/取消点赞动态
        likeMoment: (uuid, token) => 
          apiService.authenticatedPost(`/api/moment/${uuid}/like`, {}, token),

        // 获取动态评论列表
        getComments: (uuid, params = {}, token) => {
          const queryString = new URLSearchParams({
            page: params.page || 1,
            pageSize: params.pageSize || 20
          }).toString();
          return apiService.authenticatedGet(`/api/moment/${uuid}/comments?${queryString}`, token);
        },

        // 添加评论
        addComment: (uuid, content, token) => 
          apiService.authenticatedPost(`/api/moment/${uuid}/comment`, { content }, token),

  // ========== 关注功能 ==========
  
  // 关注/取消关注用户
  followUser: (target_uuid, token) => 
    apiService.authenticatedPost(`/api/follow/${target_uuid}`, {}, token),
  
  // 获取关注列表
  getFollowingList: (user_uuid, params = {}, token) => {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      pageSize: params.pageSize || 20
    }).toString();
    return apiService.authenticatedGet(`/api/follow/following/${user_uuid || ''}?${queryString}`, token);
  },
  
  // 获取粉丝列表
  getFollowersList: (user_uuid, params = {}, token) => {
    const queryString = new URLSearchParams({
      page: params.page || 1,
      pageSize: params.pageSize || 20
    }).toString();
    return apiService.authenticatedGet(`/api/follow/followers/${user_uuid || ''}?${queryString}`, token);
  },
  
  // 检查关注状态
  checkFollowStatus: (target_uuid, token) => 
    apiService.authenticatedGet(`/api/follow/status/${target_uuid}`, token),

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
  // 检查是否有可捞的瓶子
  checkBottle: (token) => 
    apiService.authenticatedGet('/api/bottle/check', token),

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

  // 扔回海里
  throwBackBottle: (bottleUuid, token) => 
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.BOTTLE.THROW_BACK, { bottleUuid }, token),
};

// 积分和签到相关API
export const pointsApi = {
  // 获取积分信息
  getPointsInfo: (token) =>
    apiService.authenticatedGet(API_CONFIG.ENDPOINTS.POINTS.GET_INFO, token),
  
  // 每日签到
  checkin: (token) =>
    apiService.authenticatedPost(API_CONFIG.ENDPOINTS.POINTS.CHECKIN, {}, token),
  
  // 获取签到历史
  getCheckinHistory: (page, limit, token) =>
    apiService.authenticatedGet(`${API_CONFIG.ENDPOINTS.POINTS.CHECKIN_HISTORY}?page=${page}&limit=${limit}`, token),
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

  // 头像上传 (本地存储)
  uploadAvatar: async (fileUri, fileName, mimeType, token) => {
    try {
      console.log('[AvatarAPI] 开始上传头像到本地:', { fileUri, fileName, mimeType, hasToken: !!token });
      
      const formData = new FormData();
      formData.append('avatar', {
        uri: fileUri,
        name: fileName || 'avatar.jpg',
        type: mimeType || 'image/jpeg',
      });

      const url = buildUrl('/api/user/avatar');
      console.log('[AvatarAPI] 上传URL:', url);

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          // 不设置 Content-Type，让 fetch 自动设置
        },
        body: formData,
      });

      const result = await res.json();
      console.log('[AvatarAPI] 上传结果:', { status: res.status, result });

      if (!res.ok) {
        throw new Error(result.message || `上传失败: ${res.status}`);
      }

      return result;
    } catch (error) {
      console.error('[AvatarAPI] 上传失败:', error);
      throw error;
    }
  },

  // 头像上传 (OSS存储) - 增强网络诊断版本
  uploadAvatarToOSS: async (fileUri, fileName, mimeType, token) => {
    try {
      console.log('[AvatarAPI] 开始上传头像到OSS:', { fileUri, fileName, mimeType, hasToken: !!token });
      
      // 详细的网络连接测试
      console.log('[AvatarAPI] 开始网络诊断...');
      const baseUrl = getBaseUrl();
      console.log('[AvatarAPI] 基础URL:', baseUrl);
      
      // 测试多个端点
      const testEndpoints = ['/health', '/api/bottle/check'];
      for (const endpoint of testEndpoints) {
        try {
          const testUrl = baseUrl + endpoint;
          console.log('[AvatarAPI] 测试端点:', testUrl);
          const testRes = await fetch(testUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
            }
          });
          console.log('[AvatarAPI] 端点测试成功:', endpoint, '状态:', testRes.status);
        } catch (testError) {
          console.error('[AvatarAPI] 端点测试失败:', endpoint, testError);
          throw new Error(`网络连接失败 (${endpoint}): ${testError.message}`);
        }
      }
      
      console.log('[AvatarAPI] 网络诊断完成，开始构建FormData...');
      
      const formData = new FormData();
      formData.append('avatar', {
        uri: fileUri,
        name: fileName || 'avatar.jpg',
        type: mimeType || 'image/jpeg',
      });

      console.log('[AvatarAPI] FormData构建完成');

      const url = buildUrl('/api/user/avatar/oss');
      console.log('[AvatarAPI] OSS上传URL:', url);
      console.log('[AvatarAPI] 请求配置:', {
        method: 'POST',
        hasAuth: !!token,
        hasFormData: true,
        tokenPrefix: token ? token.substring(0, 20) + '...' : 'none'
      });

      // 发送上传请求，添加更多配置
      console.log('[AvatarAPI] 开始发送上传请求...');
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Accept': 'application/json',
          // 不设置 Content-Type，让 fetch 自动设置 multipart/form-data
        },
        body: formData,
      });

      console.log('[AvatarAPI] 请求发送完成');
      console.log('[AvatarAPI] 响应状态:', res.status);
      console.log('[AvatarAPI] 响应头:', Object.fromEntries(res.headers.entries()));

      // 检查响应内容类型
      const contentType = res.headers.get('content-type');
      console.log('[AvatarAPI] 响应内容类型:', contentType);

      let result;
      if (contentType && contentType.includes('application/json')) {
        result = await res.json();
      } else {
        const text = await res.text();
        console.log('[AvatarAPI] 非JSON响应:', text);
        throw new Error(`服务器返回非JSON响应: ${res.status}`);
      }

      console.log('[AvatarAPI] OSS上传结果:', { status: res.status, result });

      if (!res.ok) {
        throw new Error(result.message || `OSS上传失败: ${res.status}`);
      }

      return result;
    } catch (error) {
      console.error('[AvatarAPI] OSS上传失败:', error);
      
      // 详细的错误分类
      if (error.name === 'TypeError' && error.message.includes('Network request failed')) {
        throw new Error('网络请求失败：请检查网络连接和服务器状态');
      } else if (error.name === 'AbortError') {
        throw new Error('上传超时，请检查网络连接后重试');
      } else if (error.message.includes('timeout')) {
        throw new Error('请求超时，请重试');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('无法连接到服务器，请检查网络设置');
      }
      
      throw error;
    }
  },
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
