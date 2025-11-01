import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 认证状态管理 Store
 * 
 * 管理用户登录状态、用户信息、Token 等
 */
const useAuthStore = create((set, get) => ({
  // ========== 状态 ==========
  
  // Token
  token: null,
  
  // 用户信息
  user: null,
  
  // 是否已认证
  isAuthenticated: false,
  
  // 加载状态
  isLoading: false,
  
  // 错误信息
  error: null,

  // ========== Actions ==========
  
  /**
   * 设置认证信息（登录/注册成功后调用）
   */
  setAuth: async (token, user) => {
    try {
      // 保存到 AsyncStorage
      await AsyncStorage.setItem('authToken', token);
      await AsyncStorage.setItem('userInfo', JSON.stringify(user));
      
      // 更新状态
      set({ 
        token, 
        user, 
        isAuthenticated: true,
        error: null 
      });
      
      console.log('[AuthStore] 认证信息已设置:', { 
        userId: user?.id, 
        username: user?.username 
      });
    } catch (error) {
      console.error('[AuthStore] 保存认证信息失败:', error);
      set({ error: error.message });
      throw error;
    }
  },
  
  /**
   * 退出登录
   */
  logout: async () => {
    try {
      // 清除 AsyncStorage
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userInfo');
      
      // 重置状态
      set({ 
        token: null, 
        user: null, 
        isAuthenticated: false,
        error: null
      });
      
      console.log('[AuthStore] 用户已登出');
    } catch (error) {
      console.error('[AuthStore] 登出失败:', error);
      set({ error: error.message });
    }
  },
  
  /**
   * 初始化认证状态（App 启动时调用）
   */
  initAuth: async () => {
    set({ isLoading: true });
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfo) {
        const user = JSON.parse(userInfo);
        set({ 
          token, 
          user, 
          isAuthenticated: true,
          error: null
        });
        console.log('[AuthStore] 认证状态已恢复:', { 
          userId: user?.id, 
          username: user?.username 
        });
      } else {
        console.log('[AuthStore] 无已保存的认证信息');
      }
    } catch (error) {
      console.error('[AuthStore] 初始化认证状态失败:', error);
      set({ error: error.message });
      // 出错时清除状态
      await get().logout();
    } finally {
      set({ isLoading: false });
    }
  },
  
  /**
   * 更新用户信息
   */
  updateUser: async (userData) => {
    try {
      const currentUser = get().user;
      const updatedUser = { ...currentUser, ...userData };
      
      // 保存到 AsyncStorage
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
      
      // 更新状态
      set({ user: updatedUser });
      
      console.log('[AuthStore] 用户信息已更新:', userData);
    } catch (error) {
      console.error('[AuthStore] 更新用户信息失败:', error);
      set({ error: error.message });
      throw error;
    }
  },
  
  /**
   * 刷新 Token（用于 Token 过期后自动刷新）
   */
  refreshToken: async (newToken) => {
    try {
      await AsyncStorage.setItem('authToken', newToken);
      set({ token: newToken });
      console.log('[AuthStore] Token 已刷新');
    } catch (error) {
      console.error('[AuthStore] 刷新 Token 失败:', error);
      set({ error: error.message });
      throw error;
    }
  },
  
  /**
   * 清除错误
   */
  clearError: () => {
    set({ error: null });
  },
}));

export default useAuthStore;

