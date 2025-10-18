import API_CONFIG, { buildUrl, getBaseUrl, getTimeout, getDefaultHeaders } from '../config/api.js';
import { Image } from 'react-native';

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

  // 头像上传 (OSS存储) - 优化版本，支持图片压缩和验证
  uploadAvatarToOSS: async (fileUri, fileName, mimeType, token) => {
    try {
      console.log('[AvatarAPI] 开始上传头像到OSS:', { fileUri, fileName, mimeType, hasToken: !!token });
      
      // 图片验证
      const validationResult = await validateImageFile(fileUri, fileName, mimeType);
      if (!validationResult.valid) {
        throw new Error(validationResult.error);
      }
      
      console.log('[AvatarAPI] 图片验证通过:', validationResult);
      
      // 图片压缩
      const compressedImage = await compressImage(fileUri, {
        maxWidth: 800,
        maxHeight: 800,
        quality: 0.8,
        format: 'JPEG'
      });
      
      console.log('[AvatarAPI] 图片压缩完成:', {
        originalSize: validationResult.size,
        compressedSize: compressedImage.size,
        compressionRatio: ((validationResult.size - compressedImage.size) / validationResult.size * 100).toFixed(1) + '%'
      });
      
      // 网络连接测试（简化版）
      console.log('[AvatarAPI] 开始网络诊断...');
      const baseUrl = getBaseUrl();
      
      try {
        const testRes = await fetch(baseUrl + '/health', {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          timeout: 3000
        });
        console.log('[AvatarAPI] 网络连接正常:', testRes.status);
      } catch (networkError) {
        console.warn('[AvatarAPI] 网络测试失败，继续尝试上传:', networkError.message);
      }
      
      // 将压缩后的图片转换为Base64
      console.log('[AvatarAPI] 转换图片为Base64...');
      const base64Data = await convertImageToBase64(compressedImage.uri);
      
      const url = buildUrl('/api/upload/oss');
      console.log('[AvatarAPI] 开始上传到:', url);

      // 发送Base64数据（与管理系统保持一致）
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          fileData: base64Data,
          fileName: fileName || 'avatar.jpg',
          fileType: 'image/jpeg'
        }),
      });

      console.log('[AvatarAPI] 上传响应:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`上传失败 (${res.status}): ${errorText}`);
      }

      const result = await res.json();
      console.log('[AvatarAPI] 上传成功:', result);

      return result;
    } catch (error) {
      console.error('[AvatarAPI] 头像上传失败:', error);
      
      // 优化错误信息
      if (error.message.includes('Network request failed')) {
        throw new Error('网络连接失败，请检查网络设置');
      } else if (error.message.includes('timeout')) {
        throw new Error('上传超时，请重试');
      } else if (error.message.includes('Failed to fetch')) {
        throw new Error('无法连接到服务器');
      }
      
      throw error;
    }
  },
};

// 图片验证函数
const validateImageFile = async (fileUri, fileName, mimeType) => {
  try {
    // 检查文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(mimeType?.toLowerCase())) {
      return {
        valid: false,
        error: '不支持的文件格式，请选择 JPG、PNG、GIF 或 WebP 格式的图片'
      };
    }
    
    // 检查文件大小（通过图片信息估算）
    const imageInfo = await Image.getSize(fileUri);
    const estimatedSize = (imageInfo.width * imageInfo.height * 3) / 1024; // 粗略估算KB
    
    if (estimatedSize > 10240) { // 10MB
      return {
        valid: false,
        error: '图片文件过大，请选择小于10MB的图片'
      };
    }
    
    // 检查图片尺寸
    if (imageInfo.width < 50 || imageInfo.height < 50) {
      return {
        valid: false,
        error: '图片尺寸过小，请选择至少50x50像素的图片'
      };
    }
    
    if (imageInfo.width > 4096 || imageInfo.height > 4096) {
      return {
        valid: false,
        error: '图片尺寸过大，请选择小于4096x4096像素的图片'
      };
    }
    
    return {
      valid: true,
      size: estimatedSize,
      width: imageInfo.width,
      height: imageInfo.height,
      aspectRatio: imageInfo.width / imageInfo.height
    };
  } catch (error) {
    return {
      valid: false,
      error: '无法读取图片信息，请选择有效的图片文件'
    };
  }
};

// 图片转Base64函数
const convertImageToBase64 = async (fileUri) => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result;
        // 移除 data:image/jpeg;base64, 前缀
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('[AvatarAPI] Base64转换失败:', error);
    throw new Error('图片转换失败');
  }
};

// 图片压缩函数
const compressImage = async (fileUri, options = {}) => {
  try {
    const {
      maxWidth = 800,
      maxHeight = 800,
      quality = 0.8,
      format = 'JPEG'
    } = options;
    
    // 获取原始图片信息
    const imageInfo = await Image.getSize(fileUri);
    
    // 计算压缩后的尺寸
    let { width, height } = imageInfo;
    const aspectRatio = width / height;
    
    if (width > maxWidth || height > maxHeight) {
      if (aspectRatio > 1) {
        width = maxWidth;
        height = maxWidth / aspectRatio;
      } else {
        height = maxHeight;
        width = maxHeight * aspectRatio;
      }
    }
    
    // 使用expo-image-manipulator进行压缩
    const { manipulateAsync, SaveFormat } = await import('expo-image-manipulator');
    
    const compressedImage = await manipulateAsync(
      fileUri,
      [
        {
          resize: {
            width: Math.round(width),
            height: Math.round(height)
          }
        }
      ],
      {
        compress: quality,
        format: format === 'JPEG' ? SaveFormat.JPEG : SaveFormat.PNG,
      }
    );
    
    return {
      uri: compressedImage.uri,
      width: compressedImage.width,
      height: compressedImage.height,
      size: compressedImage.fileSize || 0
    };
  } catch (error) {
    console.warn('[AvatarAPI] 图片压缩失败，使用原图:', error);
    // 如果压缩失败，返回原图
    return {
      uri: fileUri,
      size: 0
    };
  }
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
