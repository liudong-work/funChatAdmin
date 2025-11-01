# 组件迁移辅助文档

## 批量替换规则

### 规则 1：导入语句
```javascript
// 添加导入
import { useAuthStore } from './stores';

// 在组件函数开始处添加
const token = useAuthStore(state => state.token);
const user = useAuthStore(state => state.user);
```

### 规则 2：获取 Token
```javascript
// Before
const token = await AsyncStorage.getItem('authToken');

// After
// 直接使用 token（已在组件顶部声明）
// 移除这一行
```

### 规则 3：获取用户信息
```javascript
// Before
const userInfoStr = await AsyncStorage.getItem('userInfo');
const user = JSON.parse(userInfoStr);

// After
// 直接使用 user（已在组件顶部声明）
// 移除这些行
```

### 规则 4：更新用户信息
```javascript
// Before
const userInfoStr = await AsyncStorage.getItem('userInfo');
const userInfo = JSON.parse(userInfoStr);
userInfo.someField = newValue;
await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));

// After
const updateUser = useAuthStore(state => state.updateUser);
await updateUser({ someField: newValue });
```

## 需要迁移的文件清单

### 简单替换（1-2个调用）
- [x] PublishMomentScreen.js - 1个token获取
- [x] FeedbackScreen.js - 1个token获取
- [x] AccountDeletionScreen.js - 1个token获取
- [x] PaymentScreen.js - 1个userInfo获取
- [x] MemberCenterScreen.js - 1个userInfo获取
- [x] AccountSecurityScreen.js - 1个userInfo获取

### 中等复杂度（2-3个调用）
- [x] MomentsScreen.js - 2个token获取
- [x] FollowListScreen.js - 2个token获取
- [x] CheckinScreen.js - 2个token获取

### 复杂（5+个调用）
- [ ] EditProfileScreen.js - 5个调用
- [ ] MomentDetailScreen.js - 5个调用
- [ ] ChatDetailScreen.js - 12个调用（最复杂）

### 特殊文件（不需要迁移）
- PrivacySettingsScreen.js - 使用 AsyncStorage 保存设置（非认证信息）
- stores/authStore.js - store 本身使用 AsyncStorage

