# 📲 推送通知功能指南

## ✅ 已完成的实现

### 🎯 实现方案
**技术栈**: EAS Build + Expo Push Notifications

### 📋 功能清单

#### ✅ 前端功能
- ✅ 推送通知权限请求
- ✅ Expo Push Token 获取
- ✅ Token 注册到后端
- ✅ 通知监听器设置
- ✅ 点击通知跳转对应页面
- ✅ 角标管理
- ✅ 本地通知测试

#### ✅ 后端功能
- ✅ Push Token 存储和管理
- ✅ 推送通知发送服务
- ✅ 推送通知 API 路由
- ✅ 新消息推送（文字 + 图片）
- ✅ 点赞推送
- ✅ 评论推送
- ✅ 系统通知推送

---

## 📱 推送通知场景

### 1. 新消息推送
**触发条件**: 用户收到新的文字或图片消息，且不在线

**推送内容**:
- 标题: `{发送者昵称} 发来新消息`
- 正文: 消息内容预览
- 点击跳转: 聊天详情页

**代码位置**:
- 后端: `backend/src/server-with-db.js` (WebSocket 消息处理)
- 前端: `services/notificationService.js`

### 2. 点赞推送
**触发条件**: 用户的动态被其他人点赞

**推送内容**:
- 标题: `{点赞者昵称} 赞了你的动态`
- 正文: 动态内容预览
- 点击跳转: 动态详情页

**代码位置**:
- 后端: `backend/src/routes/moment-db.js` (点赞路由)

### 3. 评论推送
**触发条件**: 用户的动态被其他人评论

**推送内容**:
- 标题: `{评论者昵称} 评论了你`
- 正文: 评论内容
- 点击跳转: 动态详情页

**代码位置**:
- 后端: `backend/src/routes/moment-db.js` (评论路由)

---

## 🧪 测试推送通知

### 方法1: 使用 Expo Go 测试（推荐）

1. **启动服务**
```bash
# 启动后端
cd backend
node src/server-with-db.js

# 启动前端
npx expo start --clear
```

2. **在真机上测试**
   - 使用真机扫码运行 Expo Go
   - 登录账号（会自动注册推送Token）
   - 查看日志确认Token注册成功

3. **触发推送**
   - 方式1: 另一台设备登录另一个账号，发送消息/点赞/评论
   - 方式2: 使用测试 API（见下方）

### 方法2: 使用测试 API

```bash
# 获取用户Token
TOKEN="your_jwt_token_here"

# 发送测试推送
curl -X POST http://192.168.1.6:8889/api/push/test \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "测试通知",
    "body": "这是一条测试推送通知",
    "data": {
      "type": "test"
    }
  }'
```

### 方法3: 使用 Expo 推送工具

1. 访问: https://expo.dev/notifications
2. 输入你的 Expo Push Token (查看控制台日志获取)
3. 填写标题和正文
4. 点击"Send a Notification"

---

## 🔧 配置说明

### app.json 配置
```json
{
  "expo": {
    "notification": {
      "icon": "./assets/icon.png",
      "color": "#007AFF",
      "iosDisplayInForeground": true,
      "androidMode": "default",
      "androidCollapsedTitle": "新消息"
    },
    "android": {
      "permissions": [
        "NOTIFICATIONS",
        "RECEIVE_BOOT_COMPLETED",
        "VIBRATE"
      ],
      "useNextNotificationsApi": true
    },
    "ios": {
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#007AFF",
          "sounds": []
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "1f4d00b0-3ca2-4249-b6fb-4a3624b1db23"
      }
    }
  }
}
```

---

## 📦 打包和发布

### 使用 EAS Build 打包

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
eas login

# 3. 配置 EAS (首次)
eas build:configure

# 4. 打包 Android APK (内部测试)
eas build --platform android --profile preview

# 5. 打包生产版本
eas build --platform android --profile production

# 6. 打包 iOS (需要 Apple Developer 账号)
eas build --platform ios --profile production
```

### 打包后的推送流程
```
用户打开APP
   ↓
自动获取 Expo Push Token
   ↓
前端将 Token 发送到后端
   ↓
后端存储 Token
   ↓
用户收到新消息/点赞/评论
   ↓
后端 → Expo 推送服务器 → FCM/APNs → 用户手机
   ↓
用户收到推送通知 ✅
```

---

## 🔍 调试技巧

### 1. 查看推送Token是否注册成功
**前端日志**:
```
[推送] Expo Push Token: ExponentPushToken[xxxxxxxxxxxx]
[推送] Token注册成功
```

**后端日志**:
```
[推送服务] 用户 {uuid} 的推送Token已注册 (平台: ios/android)
```

### 2. 查看推送是否发送
**后端日志**:
```
[推送服务] 准备发送推送给用户 {uuid}: {标题}
[推送服务] 推送发送成功，票据ID: {id}
```

### 3. 常见问题

#### ❌ Token获取失败
**原因**: 必须在真机上运行，模拟器不支持推送通知
**解决**: 使用真机测试

#### ❌ Token格式无效
**原因**: Expo Push Token 格式不正确
**解决**: 确保使用 `Notifications.getExpoPushTokenAsync()` 获取

#### ❌ 推送未收到
**原因**: 
1. 用户在线（WebSocket连接存在）
2. Token已失效
3. 权限未授予

**解决**:
1. 确保测试时用户离线
2. 重新登录获取新Token
3. 在系统设置中授予通知权限

---

## 📊 推送统计（管理员）

```bash
# 获取推送统计信息
curl -X GET http://192.168.1.6:8889/api/push/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 响应示例
{
  "status": true,
  "data": {
    "total_tokens": 15,
    "registered_users": 15
  }
}
```

---

## 🚀 未来扩展

### 可以添加的功能
1. ✅ 新关注推送
2. ✅ 系统公告推送
3. ✅ 漂流瓶回复推送
4. ✅ @提及推送
5. ✅ 推送历史记录
6. ✅ 推送开关设置
7. ✅ 免打扰时段
8. ✅ 分组推送
9. ✅ 推送优先级

---

## 📝 API 文档

### 注册推送Token
```
POST /api/push/register-token
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "user_uuid": "用户UUID",
  "push_token": "ExponentPushToken[xxx]",
  "platform": "ios" | "android",
  "device_info": {
    "brand": "Apple",
    "model": "iPhone 13",
    "os": "iOS",
    "osVersion": "16.0"
  }
}

Response:
{
  "status": true,
  "message": "推送Token注册成功"
}
```

### 发送测试推送
```
POST /api/push/test
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "title": "测试标题",
  "body": "测试内容",
  "data": {
    "type": "test"
  }
}

Response:
{
  "status": true,
  "message": "测试推送发送成功",
  "data": {
    "success": true,
    "tickets": [...]
  }
}
```

### 删除推送Token
```
DELETE /api/push/token
Authorization: Bearer {token}

Response:
{
  "status": true,
  "message": "推送Token已删除"
}
```

---

## 💡 最佳实践

1. **只在真机上测试推送**
   - 模拟器不支持推送通知
   - Expo Go 必须在真机上运行

2. **合理控制推送频率**
   - 避免频繁推送打扰用户
   - 重要消息才发送推送

3. **优雅处理推送失败**
   - Token失效时删除并提示用户重新登录
   - 网络错误时记录日志

4. **保护用户隐私**
   - 不在推送中泄露敏感信息
   - 消息内容做适当截断

5. **提供推送开关**
   - 允许用户控制推送类型
   - 尊重用户的免打扰设置

---

## 🎉 总结

✅ **已完成**: EAS Build + Expo Push Notifications 完整实现
✅ **功能**: 新消息、点赞、评论推送
✅ **平台**: iOS 和 Android 都支持
✅ **费用**: 完全免费
✅ **可用性**: 开发和生产环境都可用

需要打包成独立APP时，使用 `eas build` 命令即可！🚀

