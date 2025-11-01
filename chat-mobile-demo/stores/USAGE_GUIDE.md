# 📚 Zustand 状态管理使用指南

## 概述

本项目使用 Zustand 进行全局状态管理，替代原有的分散在各组件的 `useState` 和 `useEffect`。

## 可用的 Stores

### 1. `useAuthStore` - 认证状态管理

管理用户登录状态、用户信息、Token 等。

#### 状态

- `token` - JWT Token
- `user` - 用户信息对象
- `isAuthenticated` - 是否已认证
- `isLoading` - 加载状态
- `error` - 错误信息

#### Actions

- `setAuth(token, user)` - 设置认证信息（登录/注册成功后调用）
- `logout()` - 退出登录
- `initAuth()` - 初始化认证状态（App 启动时调用）
- `updateUser(userData)` - 更新用户信息
- `refreshToken(newToken)` - 刷新 Token
- `clearError()` - 清除错误

### 2. `useSocketStore` - WebSocket 连接管理

管理 Socket.IO 连接、事件监听器、重连逻辑等。

#### 状态

- `socket` - Socket 实例
- `connected` - 连接状态
- `reconnectAttempts` - 重连次数
- `maxReconnectAttempts` - 最大重连次数
- `listeners` - 事件监听器映射
- `error` - 错误信息

#### Actions

- `connect(token)` - 连接 WebSocket
- `disconnect()` - 断开连接
- `on(event, callback)` - 注册事件监听器
- `off(event, callback)` - 注销事件监听器
- `emit(event, data)` - 发送事件
- `clearError()` - 清除错误

---

## 使用示例

### 在 App.js 中初始化

```javascript
import { useEffect } from 'react';
import { useAuthStore, useSocketStore } from './stores';

export default function App() {
  const initAuth = useAuthStore(state => state.initAuth);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const token = useAuthStore(state => state.token);
  const connect = useSocketStore(state => state.connect);
  const disconnect = useSocketStore(state => state.disconnect);
  
  // 初始化认证状态
  useEffect(() => {
    initAuth();
  }, []);
  
  // 当登录后连接 WebSocket
  useEffect(() => {
    if (isAuthenticated && token) {
      connect(token);
    } else {
      disconnect();
    }
  }, [isAuthenticated, token]);
  
  return (
    // ... 你的组件
  );
}
```

### 在登录页面使用

```javascript
import { useAuthStore } from '../stores';
import { userApi } from '../services/apiService';

export default function LoginScreen({ navigation }) {
  const setAuth = useAuthStore(state => state.setAuth);
  const error = useAuthStore(state => state.error);
  const clearError = useAuthStore(state => state.clearError);
  
  const handleLogin = async () => {
    try {
      clearError();
      const response = await userApi.login(phone, verificationCode);
      
      if (response.status) {
        // 设置认证信息
        await setAuth(response.data.token, response.data.user);
        // 导航到主页面会自动处理
      }
    } catch (error) {
      Alert.alert('登录失败', error.message);
    }
  };
  
  return (
    // ... 登录表单
  );
}
```

### 在个人中心使用

```javascript
import { useAuthStore } from '../stores';

export default function ProfileScreen() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const updateUser = useAuthStore(state => state.updateUser);
  
  const handleLogout = async () => {
    Alert.alert(
      '确认退出',
      '确定要退出登录吗？',
      [
        { text: '取消', style: 'cancel' },
        { 
          text: '确定', 
          onPress: async () => {
            await logout();
            // 导航会自动处理
          }
        }
      ]
    );
  };
  
  const handleUpdateProfile = async (newData) => {
    try {
      // 调用 API 更新
      await userApi.updateUser(user.uuid, newData, token);
      // 更新本地状态
      await updateUser(newData);
      Alert.alert('成功', '个人信息已更新');
    } catch (error) {
      Alert.alert('错误', error.message);
    }
  };
  
  return (
    <View>
      <Text>{user?.username}</Text>
      <Button title="退出登录" onPress={handleLogout} />
    </View>
  );
}
```

### 使用 WebSocket 发送消息

```javascript
import { useSocketStore } from '../stores';

export default function ChatDetailScreen({ route }) {
  const socket = useSocketStore(state => state.socket);
  const connected = useSocketStore(state => state.connected);
  const emit = useSocketStore(state => state.emit);
  const on = useSocketStore(state => state.on);
  const off = useSocketStore(state => state.off);
  
  // 注册消息监听器
  useEffect(() => {
    const handleNewMessage = (message) => {
      console.log('收到新消息:', message);
      setMessages(prev => [...prev, message]);
    };
    
    // 注册监听器
    on('new_message', handleNewMessage);
    
    // 组件卸载时注销
    return () => {
      off('new_message', handleNewMessage);
    };
  }, []);
  
  const sendMessage = () => {
    if (!connected) {
      Alert.alert('错误', '未连接到服务器');
      return;
    }
    
    const success = emit('send_message', {
      receiverId: otherUserId,
      content: messageText,
    });
    
    if (success) {
      console.log('消息已发送');
    }
  };
  
  return (
    // ... 聊天界面
  );
}
```

### 选择性订阅（性能优化）

```javascript
import { useAuthStore } from '../stores';

// ❌ 不推荐：订阅整个 store（任何状态变化都会重新渲染）
const { user, token, isAuthenticated } = useAuthStore();

// ✅ 推荐：只订阅需要的状态
const user = useAuthStore(state => state.user);
const token = useAuthStore(state => state.token);

// ✅ 更好：使用浅比较（shallow）避免不必要的重新渲染
import { shallow } from 'zustand/shallow';

const { user, token } = useAuthStore(
  state => ({ user: state.user, token: state.token }),
  shallow
);

// ✅ 最佳：只订阅 actions（actions 不会变化）
const setAuth = useAuthStore(state => state.setAuth);
const logout = useAuthStore(state => state.logout);
```

---

## 迁移指南

### 从 useState + AsyncStorage 迁移

#### Before（旧代码）

```javascript
const [token, setToken] = useState(null);
const [user, setUser] = useState(null);

useEffect(() => {
  const loadAuth = async () => {
    const savedToken = await AsyncStorage.getItem('authToken');
    const savedUser = await AsyncStorage.getItem('userInfo');
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
  };
  loadAuth();
}, []);

const handleLogin = async () => {
  const response = await userApi.login(phone, code);
  await AsyncStorage.setItem('authToken', response.token);
  await AsyncStorage.setItem('userInfo', JSON.stringify(response.user));
  setToken(response.token);
  setUser(response.user);
};
```

#### After（新代码）

```javascript
const initAuth = useAuthStore(state => state.initAuth);
const setAuth = useAuthStore(state => state.setAuth);
const token = useAuthStore(state => state.token);
const user = useAuthStore(state => state.user);

useEffect(() => {
  initAuth(); // 一行代码搞定
}, []);

const handleLogin = async () => {
  const response = await userApi.login(phone, code);
  await setAuth(response.token, response.user); // 一行代码搞定
};
```

### 从 Prop Drilling 迁移

#### Before（旧代码 - Prop Drilling）

```javascript
// App.js
function App() {
  const [user, setUser] = useState(null);
  return <HomeScreen user={user} setUser={setUser} />;
}

// HomeScreen.js
function HomeScreen({ user, setUser }) {
  return <ProfileScreen user={user} setUser={setUser} />;
}

// ProfileScreen.js
function ProfileScreen({ user, setUser }) {
  return <Text>{user?.name}</Text>;
}
```

#### After（新代码 - 全局状态）

```javascript
// App.js
function App() {
  return <HomeScreen />;
}

// HomeScreen.js
function HomeScreen() {
  return <ProfileScreen />;
}

// ProfileScreen.js
import { useAuthStore } from '../stores';

function ProfileScreen() {
  const user = useAuthStore(state => state.user);
  return <Text>{user?.name}</Text>;
}
```

---

## 最佳实践

### 1. 使用选择器避免不必要的重新渲染

```javascript
// ❌ 整个 store 变化都会重新渲染
const store = useAuthStore();

// ✅ 只在 user 变化时重新渲染
const user = useAuthStore(state => state.user);
```

### 2. Actions 可以在组件外调用

```javascript
import { useAuthStore } from './stores';

// 在任何地方都可以调用
export const checkAuthAndRedirect = async () => {
  const isAuthenticated = useAuthStore.getState().isAuthenticated;
  if (!isAuthenticated) {
    // 重定向到登录页
  }
};
```

### 3. 配合 React DevTools 调试

```javascript
// 开发环境启用 Zustand DevTools
import { devtools } from 'zustand/middleware';

const useAuthStore = create(
  devtools(
    (set) => ({
      // ... store 定义
    }),
    { name: 'AuthStore' }
  )
);
```

### 4. 持久化存储（已内置）

我们的 `authStore` 已经自动集成了 AsyncStorage 持久化，无需额外配置。

---

## 常见问题

### Q: 如何在 API 请求中使用 token？

```javascript
import { useAuthStore } from '../stores';

// 在组件中
const MyComponent = () => {
  const token = useAuthStore(state => state.token);
  
  const fetchData = async () => {
    const response = await apiService.authenticatedGet('/api/data', token);
  };
};

// 在组件外
export const fetchUserData = async () => {
  const token = useAuthStore.getState().token;
  return await apiService.authenticatedGet('/api/user', token);
};
```

### Q: 如何监听状态变化？

```javascript
import { useEffect } from 'react';
import { useAuthStore } from '../stores';

useEffect(() => {
  // 订阅状态变化
  const unsubscribe = useAuthStore.subscribe(
    (state) => state.user,
    (user) => {
      console.log('用户信息变化:', user);
    }
  );
  
  // 清理订阅
  return unsubscribe;
}, []);
```

### Q: 如何重置整个 store？

```javascript
// 调用 logout 会重置 authStore
await useAuthStore.getState().logout();

// 调用 disconnect 会重置 socketStore
useSocketStore.getState().disconnect();
```

---

## 更多资源

- [Zustand 官方文档](https://github.com/pmndrs/zustand)
- [React Native 最佳实践](https://reactnative.dev/docs/performance)
- [状态管理对比](https://www.npmjs.com/package/zustand#comparison-with-other-state-management-libraries)

