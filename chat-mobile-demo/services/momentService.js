import { getApiUrl } from '../config/api';
import apiService from './apiService';

const API_URL = getApiUrl();

/**
 * 动态服务
 */
const momentService = {
  /**
   * 发布动态
   */
  publishMoment: async (content, images, location, token) => {
    try {
      const response = await fetch(`${API_URL}/api/moments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          images,
          location
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '发布失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 发布动态失败:', error);
      throw error;
    }
  },

  /**
   * 获取动态列表
   */
  getMomentList: async (page = 1, pageSize = 10, userId = null, token) => {
    try {
      let url = `${API_URL}/api/moments?page=${page}&pageSize=${pageSize}`;
      if (userId) {
        url += `&userId=${userId}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '获取动态列表失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 获取动态列表失败:', error);
      throw error;
    }
  },

  /**
   * 获取动态详情
   */
  getMomentDetail: async (momentUuid, token) => {
    try {
      const response = await fetch(`${API_URL}/api/moments/${momentUuid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '获取动态详情失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 获取动态详情失败:', error);
      throw error;
    }
  },

  /**
   * 删除动态
   */
  deleteMoment: async (momentUuid, token) => {
    try {
      const response = await fetch(`${API_URL}/api/moments/${momentUuid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '删除失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 删除动态失败:', error);
      throw error;
    }
  },

  /**
   * 点赞动态
   */
  likeMoment: async (momentUuid, token) => {
    try {
      const response = await fetch(`${API_URL}/api/moments/${momentUuid}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '点赞失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 点赞失败:', error);
      throw error;
    }
  },

  /**
   * 取消点赞
   */
  unlikeMoment: async (momentUuid, token) => {
    try {
      const response = await fetch(`${API_URL}/api/moments/${momentUuid}/like`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || '取消点赞失败');
      }

      return data;
    } catch (error) {
      console.error('[MomentService] 取消点赞失败:', error);
      throw error;
    }
  }
};

export default momentService;

