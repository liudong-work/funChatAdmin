import { create } from 'zustand';

/**
 * 聊天状态管理 Store
 * 
 * 管理聊天消息、输入状态、语音录制、图片预览等状态
 */
const useChatStore = create((set, get) => ({
  // ========== 消息相关状态 ==========
  
  // 所有对话的消息（按对话ID存储）
  conversations: {}, // { conversationId: { messages: [], isLoading: false, hasMore: true, page: 0 } }
  
  // 当前活跃的对话ID
  activeConversationId: null,
  
  // 获取当前对话的消息
  getCurrentMessages: () => {
    const { conversations, activeConversationId } = get();
    return conversations[activeConversationId]?.messages || [];
  },
  
  // 设置当前活跃对话
  setActiveConversation: (conversationId) => {
    set({ activeConversationId: conversationId });
    
    // 如果对话不存在，初始化
    const { conversations } = get();
    if (!conversations[conversationId]) {
      set({
        conversations: {
          ...conversations,
          [conversationId]: {
            messages: [],
            isLoading: false,
            hasMore: true,
            page: 0,
            pageSize: 20,
          }
        }
      });
    }
  },
  
  // 添加消息到对话
  addMessage: (conversationId, message) => {
    const { conversations } = get();
    const conversation = conversations[conversationId];
    
    if (!conversation) return;
    
    set({
      conversations: {
        ...conversations,
        [conversationId]: {
          ...conversation,
          messages: [...conversation.messages, message],
        }
      }
    });
  },
  
  // 批量设置消息
  setMessages: (conversationId, messages) => {
    const { conversations } = get();
    const conversation = conversations[conversationId];
    
    if (!conversation) return;
    
    set({
      conversations: {
        ...conversations,
        [conversationId]: {
          ...conversation,
          messages: messages,
        }
      }
    });
  },
  
  // 加载更多消息
  loadMoreMessages: async (conversationId, loadFunction) => {
    const { conversations } = get();
    const conversation = conversations[conversationId];
    
    if (!conversation || conversation.isLoading || !conversation.hasMore) return;
    
    // 设置加载状态
    set({
      conversations: {
        ...conversations,
        [conversationId]: {
          ...conversation,
          isLoading: true,
        }
      }
    });
    
    try {
      const nextPage = conversation.page + 1;
      const newMessages = await loadFunction(nextPage, conversation.pageSize);
      
      set({
        conversations: {
          ...conversations,
          [conversationId]: {
            ...conversation,
            messages: [...newMessages, ...conversation.messages],
            page: nextPage,
            hasMore: newMessages.length === conversation.pageSize,
            isLoading: false,
          }
        }
      });
    } catch (error) {
      console.error('[ChatStore] 加载更多消息失败:', error);
      set({
        conversations: {
          ...conversations,
          [conversationId]: {
            ...conversation,
            isLoading: false,
          }
        }
      });
    }
  },
  
  // ========== 输入状态 ==========
  
  inputTexts: {}, // { conversationId: 'text' }
  
  setInputText: (conversationId, text) => {
    const { inputTexts } = get();
    set({
      inputTexts: {
        ...inputTexts,
        [conversationId]: text,
      }
    });
  },
  
  getInputText: (conversationId) => {
    return get().inputTexts[conversationId] || '';
  },
  
  clearInputText: (conversationId) => {
    const { inputTexts } = get();
    const newInputTexts = { ...inputTexts };
    delete newInputTexts[conversationId];
    set({ inputTexts: newInputTexts });
  },
  
  // ========== 图片预览状态 ==========
  
  imagePreview: {
    visible: false,
    url: '',
    burnTimer: null,
  },
  
  showImagePreview: (url, burnTimer = null) => {
    set({
      imagePreview: {
        visible: true,
        url: url,
        burnTimer: burnTimer,
      }
    });
  },
  
  hideImagePreview: () => {
    const { imagePreview } = get();
    if (imagePreview.burnTimer) {
      clearTimeout(imagePreview.burnTimer);
    }
    set({
      imagePreview: {
        visible: false,
        url: '',
        burnTimer: null,
      }
    });
  },
  
  // ========== 语音录制状态 ==========
  
  voiceRecording: {
    isRecording: false,
    recordSeconds: 0,
    conversationId: null,
  },
  
  startRecording: (conversationId) => {
    set({
      voiceRecording: {
        isRecording: true,
        recordSeconds: 0,
        conversationId: conversationId,
      }
    });
  },
  
  stopRecording: () => {
    set({
      voiceRecording: {
        isRecording: false,
        recordSeconds: 0,
        conversationId: null,
      }
    });
  },
  
  updateRecordSeconds: (seconds) => {
    const { voiceRecording } = get();
    set({
      voiceRecording: {
        ...voiceRecording,
        recordSeconds: seconds,
      }
    });
  },
  
  // ========== 语音播放状态 ==========
  
  voicePlaying: {
    messageId: null,
    progress: 0,
  },
  
  setPlayingVoice: (messageId, progress = 0) => {
    set({
      voicePlaying: {
        messageId: messageId,
        progress: progress,
      }
    });
  },
  
  stopPlayingVoice: () => {
    set({
      voicePlaying: {
        messageId: null,
        progress: 0,
      }
    });
  },
  
  // ========== 键盘状态 ==========
  
  keyboard: {
    visible: false,
    height: 0,
  },
  
  setKeyboardVisible: (visible, height = 0) => {
    set({
      keyboard: {
        visible: visible,
        height: height,
      }
    });
  },
  
  // ========== 对话列表管理 ==========
  
  conversationList: {
    users: [],
    refreshing: false,
    loading: false,
  },
  
  // 获取对话列表
  getConversationList: () => {
    return get().conversationList.users;
  },
  
  // 设置对话列表
  setConversationList: (users) => {
    const { conversationList } = get();
    set({
      conversationList: {
        ...conversationList,
        users: users,
      }
    });
  },
  
  // 添加或更新对话
  addOrUpdateConversation: (senderUuid, senderName, lastMessage, messageType = 'text', imageUrl = null) => {
    const { conversationList } = get();
    const users = [...conversationList.users];
    
    const existingIndex = users.findIndex(u => u.id === senderUuid);
    const newTime = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    
    if (existingIndex >= 0) {
      // 更新现有对话
      users[existingIndex] = {
        ...users[existingIndex],
        lastMessage,
        lastMessageImageUrl: imageUrl,
        lastTime: newTime,
        unreadCount: (users[existingIndex].unreadCount || 0) + 1,
      };
      // 移到最前面
      const [moved] = users.splice(existingIndex, 1);
      users.unshift(moved);
    } else {
      // 添加新对话
      const newUser = {
        id: senderUuid,
        name: senderName || '陌生人',
        avatar: '👤',
        lastMessage,
        lastMessageImageUrl: imageUrl,
        lastTime: newTime,
        unreadCount: 1,
      };
      users.unshift(newUser);
    }
    
    set({
      conversationList: {
        ...conversationList,
        users: users,
      }
    });
  },
  
  // 删除对话
  removeConversation: (conversationId) => {
    const { conversationList } = get();
    set({
      conversationList: {
        ...conversationList,
        users: conversationList.users.filter(u => u.id !== conversationId),
      }
    });
  },
  
  // 设置刷新状态
  setConversationRefreshing: (refreshing) => {
    const { conversationList } = get();
    set({
      conversationList: {
        ...conversationList,
        refreshing: refreshing,
      }
    });
  },
  
  // 设置加载状态
  setConversationLoading: (loading) => {
    const { conversationList } = get();
    set({
      conversationList: {
        ...conversationList,
        loading: loading,
      }
    });
  },
  
  // ========== 清理函数 ==========
  
  clearConversation: (conversationId) => {
    const { conversations, inputTexts } = get();
    
    // 移除对话
    const newConversations = { ...conversations };
    delete newConversations[conversationId];
    
    // 移除输入文本
    const newInputTexts = { ...inputTexts };
    delete newInputTexts[conversationId];
    
    set({
      conversations: newConversations,
      inputTexts: newInputTexts,
    });
  },
  
  clearAll: () => {
    set({
      conversations: {},
      activeConversationId: null,
      inputTexts: {},
      imagePreview: {
        visible: false,
        url: '',
        burnTimer: null,
      },
      voiceRecording: {
        isRecording: false,
        recordSeconds: 0,
        conversationId: null,
      },
      voicePlaying: {
        messageId: null,
        progress: 0,
      },
      keyboard: {
        visible: false,
        height: 0,
      },
    });
  },
}));

export default useChatStore;

