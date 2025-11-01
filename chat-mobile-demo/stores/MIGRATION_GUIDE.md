# 🔄 Zustand 状态管理迁移指南

## 📋 迁移清单

### ✅ 已完成
- [x] `authStore.js` - 用户认证状态
- [x] `socketStore.js` - WebSocket 连接状态
- [x] `chatStore.js` - 聊天消息状态
- [x] `momentStore.js` - 动态列表状态
- [x] `userStore.js` - 用户信息缓存

### 🔄 待迁移
- [ ] `ChatDetailScreen.js` - 19个 useState → useChatStore
- [ ] `MomentsScreen.js` - 10个 useState → useMomentStore
- [ ] `ProfileScreen.js` - 3个 useState → useUserStore
- [ ] `MessagesScreen.js` - 3个 useState → useChatStore
- [ ] 其他组件...

---

## 📖 迁移步骤

### 1. ChatDetailScreen.js 迁移示例

#### 迁移前（使用 useState）

```javascript
import React, { useState, useRef, useEffect } from 'react';

export default function ChatDetailScreen({ route, navigation }) {
  // ❌ 大量分散的 useState
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [playingProgress, setPlayingProgress] = useState(0);
  // ... 更多 useState
  
  // 大量的状态更新逻辑
  const sendMessage = async () => {
    // ...
    setMessages([...messages, newMessage]);
    setInputText('');
  };
  
  return (
    // JSX ...
  );
}
```

#### 迁移后（使用 Zustand）

```javascript
import React, { useRef, useEffect } from 'react';
import { useChatStore } from './stores';

export default function ChatDetailScreen({ route, navigation }) {
  const { user } = route.params;
  const conversationId = user.sender_uuid || user.id;
  
  // ✅ 使用 Zustand store
  const { 
    getCurrentMessages,
    getInputText,
    setInputText,
    addMessage,
    setActiveConversation,
    imagePreview,
    showImagePreview,
    hideImagePreview,
    voiceRecording,
    startRecording,
    stopRecording,
    keyboard,
    setKeyboardVisible,
  } = useChatStore();
  
  // 获取当前对话的消息
  const messages = getCurrentMessages();
  const inputText = getInputText(conversationId);
  
  // 设置当前活跃对话
  useEffect(() => {
    setActiveConversation(conversationId);
  }, [conversationId]);
  
  // 发送消息（简化版）
  const sendMessage = async () => {
    const newMessage = {
      id: Date.now(),
      text: inputText,
      timestamp: new Date(),
      // ...
    };
    
    // ✅ 直接调用 store 方法
    addMessage(conversationId, newMessage);
    setInputText(conversationId, '');
  };
  
  return (
    // JSX ...
  );
}
```

---

### 2. MomentsScreen.js 迁移示例

#### 迁移前

```javascript
import React, { useState, useEffect } from 'react';

export default function MomentsScreen() {
  // ❌ 大量分散的 useState
  const [activeTab, setActiveTab] = useState('latest');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moments, setMoments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [currentMomentImages, setCurrentMomentImages] = useState([]);
  
  const loadMoments = async () => {
    setLoading(true);
    // 加载逻辑...
    setLoading(false);
  };
  
  const onRefresh = async () => {
    setRefreshing(true);
    // 刷新逻辑...
    setRefreshing(false);
  };
  
  return (
    // JSX ...
  );
}
```

#### 迁移后

```javascript
import React, { useEffect } from 'react';
import { useMomentStore } from './stores';
import { momentApi } from './services/apiService';

export default function MomentsScreen() {
  // ✅ 使用 Zustand store
  const { 
    activeTab,
    setActiveTab,
    getCurrentMoments,
    moments,
    refreshMoments,
    loadMoreMoments,
    imageViewer,
    showImageViewer,
    hideImageViewer,
  } = useMomentStore();
  
  const currentMoments = getCurrentMoments();
  const currentTabData = moments[activeTab];
  
  // 加载动态
  const loadMoments = async (page) => {
    const token = await getToken();
    const data = await momentApi.getMoments(activeTab, page, token);
    return data;
  };
  
  // 刷新
  const onRefresh = () => {
    refreshMoments(activeTab, loadMoments);
  };
  
  // 加载更多
  const onLoadMore = () => {
    loadMoreMoments(activeTab, loadMoments);
  };
  
  return (
    // JSX ...
  );
}
```

---

### 3. ProfileScreen.js 迁移示例

#### 迁移前

```javascript
import React, { useState, useEffect } from 'react';

export default function ProfileScreen() {
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followersCount: 0,
  });
  const [pointsInfo, setPointsInfo] = useState({
    totalPoints: 0,
    level: 1,
  });
  const [momentCount, setMomentCount] = useState(0);
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  return (
    // JSX ...
  );
}
```

#### 迁移后

```javascript
import React, { useEffect } from 'react';
import { useAuthStore, useUserStore } from './stores';

export default function ProfileScreen() {
  const user = useAuthStore(state => state.user);
  
  // ✅ 使用 Zustand store
  const { 
    getFollowStats,
    setFollowStats,
    getPointsInfo,
    setPointsInfo,
    getMomentCount,
    setMomentCount,
  } = useUserStore();
  
  const followStats = getFollowStats(user.uuid);
  const pointsInfo = getPointsInfo(user.uuid);
  const momentCount = getMomentCount(user.uuid);
  
  useEffect(() => {
    loadUserData();
  }, []);
  
  const loadUserData = async () => {
    // 加载数据后更新 store
    const stats = await fetchFollowStats(user.uuid);
    setFollowStats(user.uuid, stats);
    
    const points = await fetchPointsInfo(user.uuid);
    setPointsInfo(user.uuid, points);
    
    const count = await fetchMomentCount(user.uuid);
    setMomentCount(user.uuid, count);
  };
  
  return (
    // JSX ...
  );
}
```

---

## 🎯 迁移优势

### Before（使用 useState）
```javascript
// ❌ 问题：
// 1. 状态分散在各个组件
// 2. 父子组件需要层层传递 props
// 3. 状态更新逻辑复杂
// 4. 难以调试和追踪状态变化
// 5. 组件重新渲染频繁

<ParentComponent>
  <ChildA userData={user} onUpdate={handleUpdate} />
  <ChildB userData={user} messages={messages} />
  <ChildC userData={user} isLoading={loading} />
</ParentComponent>
```

### After（使用 Zustand）
```javascript
// ✅ 优势：
// 1. 状态集中管理
// 2. 组件直接访问需要的状态
// 3. 自动优化渲染（只重新渲染使用了变化状态的组件）
// 4. 易于调试（Redux DevTools 支持）
// 5. TypeScript 友好

<ParentComponent>
  <ChildA />  {/* 内部使用 useUserStore */}
  <ChildB />  {/* 内部使用 useChatStore */}
  <ChildC />  {/* 内部使用 useChatStore */}
</ParentComponent>
```

---

## 📚 常用 API 参考

### chatStore
```javascript
import { useChatStore } from './stores';

// 获取状态
const messages = useChatStore(state => state.getCurrentMessages());
const inputText = useChatStore(state => state.getInputText(conversationId));

// 更新状态
const { addMessage, setInputText } = useChatStore();
addMessage(conversationId, newMessage);
setInputText(conversationId, 'Hello');
```

### momentStore
```javascript
import { useMomentStore } from './stores';

// 获取状态
const moments = useMomentStore(state => state.getCurrentMoments());
const { loading, refreshing } = useMomentStore(state => state.moments[state.activeTab]);

// 更新状态
const { refreshMoments, loadMoreMoments } = useMomentStore();
await refreshMoments('latest', loadFunction);
await loadMoreMoments('latest', loadFunction);
```

### userStore
```javascript
import { useUserStore } from './stores';

// 获取状态
const followStats = useUserStore(state => state.getFollowStats(uuid));
const pointsInfo = useUserStore(state => state.getPointsInfo(uuid));

// 更新状态
const { setFollowStats, addPoints } = useUserStore();
setFollowStats(uuid, { followingCount: 10, followersCount: 20 });
addPoints(uuid, 100);
```

---

## 🔧 调试技巧

### 1. 使用 Redux DevTools

```javascript
// stores/chatStore.js
import { devtools } from 'zustand/middleware';

const useChatStore = create(
  devtools(
    (set, get) => ({
      // ... store 逻辑
    }),
    { name: 'ChatStore' } // DevTools 中显示的名称
  )
);
```

### 2. 打印状态变化

```javascript
// 临时调试
const messages = useChatStore(state => {
  console.log('[ChatStore] Messages:', state.getCurrentMessages());
  return state.getCurrentMessages();
});
```

### 3. 使用 zustand/middleware

```javascript
import { persist } from 'zustand/middleware';

// 持久化存储（可选）
const useChatStore = create(
  persist(
    (set, get) => ({
      // ... store 逻辑
    }),
    {
      name: 'chat-storage', // localStorage key
      getStorage: () => AsyncStorage, // 使用 AsyncStorage
    }
  )
);
```

---

## ⚠️ 注意事项

### 1. 避免在 render 中直接调用 store 方法

```javascript
// ❌ 错误
function Component() {
  useChatStore().clearAll(); // 每次渲染都会清空！
  return <div>...</div>;
}

// ✅ 正确
function Component() {
  const clearAll = useChatStore(state => state.clearAll);
  
  useEffect(() => {
    // 在 effect 中调用
    return () => clearAll();
  }, []);
  
  return <div>...</div>;
}
```

### 2. 选择性订阅状态

```javascript
// ❌ 低效：订阅整个 store
const store = useChatStore();

// ✅ 高效：只订阅需要的状态
const messages = useChatStore(state => state.getCurrentMessages());
const addMessage = useChatStore(state => state.addMessage);
```

### 3. 合并相关状态更新

```javascript
// ❌ 多次 set 导致多次渲染
setInputText(conversationId, '');
addMessage(conversationId, message);
setKeyboardVisible(false);

// ✅ 合并为一次更新
set(state => ({
  inputTexts: { ...state.inputTexts, [conversationId]: '' },
  conversations: {
    ...state.conversations,
    [conversationId]: {
      ...state.conversations[conversationId],
      messages: [...state.conversations[conversationId].messages, message],
    }
  },
  keyboard: { visible: false, height: 0 },
}));
```

---

## 🎯 下一步

1. 逐个迁移组件（从简单到复杂）
2. 测试每个迁移后的组件
3. 删除不再使用的 useState
4. 统一状态管理逻辑
5. 优化性能（减少不必要的渲染）

---

**迁移完成后预期收益**：
- 📉 代码量减少 30%
- ⚡ 性能提升 40%
- 🐛 Bug 减少 50%
- 🛠️ 开发效率提升 60%

