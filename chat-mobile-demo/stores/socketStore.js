import { create } from 'zustand';
import io from 'socket.io-client';
import { getWebSocketUrl } from '../config/api';

/**
 * WebSocket 连接状态管理 Store
 * 
 * 管理 Socket.IO 连接、事件监听器、重连逻辑等
 */
const useSocketStore = create((set, get) => ({
  // ========== 状态 ==========
  
  // Socket 实例
  socket: null,
  
  // 连接状态
  connected: false,
  
  // 重连次数
  reconnectAttempts: 0,
  
  // 最大重连次数
  maxReconnectAttempts: 5,
  
  // 事件监听器映射 { eventName: [callback1, callback2, ...] }
  listeners: {},
  
  // 错误信息
  error: null,

  // ========== Actions ==========
  
  /**
   * 连接 WebSocket
   */
  connect: (token) => {
    const { socket, connected } = get();
    
    // 如果已连接，直接返回
    if (socket?.connected || connected) {
      console.log('[SocketStore] Socket 已连接');
      return;
    }
    
    try {
      const wsUrl = getWebSocketUrl();
      console.log('[SocketStore] 正在连接到:', wsUrl);
      
      // 创建 Socket 连接
      const newSocket = io(wsUrl, {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: get().maxReconnectAttempts,
      });
      
      // 设置事件处理器
      get().setupEventHandlers(newSocket);
      
      // 更新状态
      set({ socket: newSocket });
      
    } catch (error) {
      console.error('[SocketStore] 连接失败:', error);
      set({ error: error.message });
    }
  },
  
  /**
   * 断开 WebSocket 连接
   */
  disconnect: () => {
    const { socket } = get();
    
    if (socket) {
      console.log('[SocketStore] 断开 Socket 连接');
      socket.disconnect();
      set({ 
        socket: null, 
        connected: false,
        reconnectAttempts: 0,
        listeners: {},
        error: null
      });
    }
  },
  
  /**
   * 设置事件处理器
   */
  setupEventHandlers: (socket) => {
    // 连接成功
    socket.on('connect', () => {
      console.log('[SocketStore] Socket 连接成功');
      set({ 
        connected: true, 
        reconnectAttempts: 0,
        error: null
      });
    });
    
    // 断开连接
    socket.on('disconnect', (reason) => {
      console.log('[SocketStore] Socket 断开连接:', reason);
      set({ connected: false });
      
      // 如果不是客户端主动断开，尝试重连
      if (reason !== 'io client disconnect') {
        get().handleReconnect();
      }
    });
    
    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('[SocketStore] Socket 连接错误:', error);
      set({ 
        error: error.message,
        connected: false 
      });
      get().handleReconnect();
    });
    
    // 重连尝试
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[SocketStore] 重连尝试:', attemptNumber);
      set({ reconnectAttempts: attemptNumber });
    });
    
    // 重连成功
    socket.on('reconnect', (attemptNumber) => {
      console.log('[SocketStore] 重连成功，尝试次数:', attemptNumber);
      set({ 
        connected: true,
        reconnectAttempts: 0,
        error: null
      });
    });
    
    // 重连失败
    socket.on('reconnect_failed', () => {
      console.error('[SocketStore] 重连失败，已达最大尝试次数');
      set({ 
        error: '无法连接到服务器，请检查网络',
        connected: false
      });
    });
  },
  
  /**
   * 处理重连逻辑
   */
  handleReconnect: () => {
    const { reconnectAttempts, maxReconnectAttempts } = get();
    
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('[SocketStore] 已达最大重连次数');
      set({ error: '连接失败，请刷新重试' });
      return;
    }
    
    console.log('[SocketStore] 准备重连...');
  },
  
  /**
   * 注册事件监听器
   */
  on: (event, callback) => {
    const { socket, listeners } = get();
    
    if (!socket) {
      console.warn('[SocketStore] Socket 未连接，无法注册监听器');
      return;
    }
    
    // 如果是首次注册该事件，设置 Socket 监听
    if (!listeners[event]) {
      socket.on(event, (...args) => {
        const currentListeners = get().listeners[event] || [];
        currentListeners.forEach(cb => cb(...args));
      });
      
      set({ 
        listeners: { 
          ...listeners, 
          [event]: [callback] 
        } 
      });
    } else {
      // 添加到已有监听器列表
      set({ 
        listeners: { 
          ...listeners, 
          [event]: [...listeners[event], callback] 
        } 
      });
    }
    
    console.log('[SocketStore] 注册监听器:', event);
  },
  
  /**
   * 注销事件监听器
   */
  off: (event, callback) => {
    const { listeners } = get();
    
    if (!listeners[event]) {
      return;
    }
    
    // 从监听器列表中移除
    const updatedListeners = listeners[event].filter(cb => cb !== callback);
    
    if (updatedListeners.length === 0) {
      // 如果没有监听器了，移除该事件
      const { [event]: removed, ...rest } = listeners;
      set({ listeners: rest });
    } else {
      set({ 
        listeners: { 
          ...listeners, 
          [event]: updatedListeners 
        } 
      });
    }
    
    console.log('[SocketStore] 注销监听器:', event);
  },
  
  /**
   * 发送事件
   */
  emit: (event, data) => {
    const { socket, connected } = get();
    
    if (!socket || !connected) {
      console.warn('[SocketStore] Socket 未连接，无法发送事件');
      return false;
    }
    
    socket.emit(event, data);
    console.log('[SocketStore] 发送事件:', event, data);
    return true;
  },
  
  /**
   * 清除错误
   */
  clearError: () => {
    set({ error: null });
  },
}));

export default useSocketStore;

