# 🎙️ Expo 中实现 WebRTC 语音通话的技术方案

## 🚨 核心问题

**react-native-webrtc 不支持 Expo managed workflow！**

原因：需要 native modules 编译，Expo Go 不支持自定义 native 代码。

---

## 💡 解决方案对比

### 方案 1: 使用 Expo Dev Client ⭐ 推荐

**优点**:
- ✅ 保留 Expo 的大部分便利功能
- ✅ 支持自定义 native modules
- ✅ 可以使用 react-native-webrtc
- ✅ 仍然可以使用 EAS Build
- ✅ 开发体验良好

**缺点**:
- ⚠️ 不能使用 Expo Go，需要构建自定义开发客户端
- ⚠️ 需要配置开发环境（Android Studio / Xcode）

**实施步骤**:
```bash
# 1. 安装 expo-dev-client
npx expo install expo-dev-client

# 2. 安装 react-native-webrtc
npm install react-native-webrtc

# 3. 预构建
npx expo prebuild

# 4. 构建开发客户端
# iOS
npx expo run:ios

# Android
npx expo run:android
```

---

### 方案 2: 切换到 Bare Workflow

**优点**:
- ✅ 完全控制 native 代码
- ✅ 支持所有 React Native 库
- ✅ 性能更好

**缺点**:
- ❌ 失去 Expo 的便利性
- ❌ 需要手动管理 native 配置
- ❌ 需要 Xcode 和 Android Studio

**实施步骤**:
```bash
# 弹出到 bare workflow（不可逆！）
npx expo eject

# 安装依赖
npm install react-native-webrtc

# 配置 native 代码
cd ios && pod install
```

---

### 方案 3: 使用替代方案（不推荐）

**Agora SDK / Twilio Video**:
- ✅ 支持 Expo
- ❌ 需要付费
- ❌ 不是真正的 P2P，需要通过云服务器

---

## 🎯 推荐方案：Expo Dev Client

基于我们的项目情况，**强烈推荐使用方案 1（Expo Dev Client）**，原因：

1. ✅ 保持 Expo 的便利性
2. ✅ 支持 WebRTC
3. ✅ 可以继续使用现有的所有 Expo 功能
4. ✅ 开发体验仍然很好

---

## 📝 实施计划（使用 Expo Dev Client）

### 第一步：安装 expo-dev-client

```bash
npx expo install expo-dev-client
```

### 第二步：安装 react-native-webrtc

```bash
npm install react-native-webrtc
```

### 第三步：配置权限

修改 `app.json`:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-dev-client"
      ],
      [
        "react-native-webrtc",
        {
          "cameraPermission": "需要访问摄像头进行视频通话",
          "microphonePermission": "需要访问麦克风进行语音通话"
        }
      ]
    ],
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "需要访问摄像头进行视频通话",
        "NSMicrophoneUsageDescription": "需要访问麦克风进行语音通话"
      }
    },
    "android": {
      "permissions": [
        "CAMERA",
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ]
    }
  }
}
```

### 第四步：预构建项目

```bash
npx expo prebuild
```

这会生成 `ios/` 和 `android/` 目录。

### 第五步：构建开发客户端

**Android**:
```bash
npx expo run:android
```

**iOS**:
```bash
npx expo run:ios
```

### 第六步：开发调试

之后开发时运行：
```bash
npx expo start --dev-client
```

然后在自定义开发客户端中打开应用（不再使用 Expo Go）。

---

## 🔍 WebRTC 信令协议设计

参考 go-chat 项目，我们需要实现以下信令：

### WebSocket 事件

```javascript
// 发起方 → 服务器 → 接收方
socket.emit('call_offer', {
  from: 'user_xxx',
  to: 'user_yyy',
  offer: sdpOffer  // WebRTC SDP Offer
});

// 接收方 → 服务器 → 发起方
socket.emit('call_answer', {
  from: 'user_yyy',
  to: 'user_xxx',
  answer: sdpAnswer  // WebRTC SDP Answer
});

// 双向交换 ICE 候选者
socket.emit('ice_candidate', {
  from: 'user_xxx',
  to: 'user_yyy',
  candidate: iceCandidate
});

// 拒绝通话
socket.emit('call_reject', {
  from: 'user_yyy',
  to: 'user_xxx'
});

// 挂断通话
socket.emit('call_hangup', {
  from: 'user_xxx',
  to: 'user_yyy'
});
```

---

## 🎬 WebRTC 连接流程（简化版）

```javascript
// 1. 发起方创建 Offer
const peerConnection = new RTCPeerConnection(config);
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// 2. 通过信令服务器发送 Offer
socket.emit('call_offer', { to: receiverId, offer });

// 3. 接收方收到 Offer，创建 Answer
await peerConnection.setRemoteDescription(offer);
const answer = await peerConnection.createAnswer();
await peerConnection.setLocalDescription(answer);

// 4. 通过信令服务器发送 Answer
socket.emit('call_answer', { to: callerId, answer });

// 5. 发起方收到 Answer
await peerConnection.setRemoteDescription(answer);

// 6. 双方交换 ICE 候选者
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('ice_candidate', { 
      to: otherId, 
      candidate: event.candidate 
    });
  }
};

// 7. 连接建立，音频流开始传输
peerConnection.ontrack = (event) => {
  // 播放远程音频流
  const remoteStream = event.streams[0];
};
```

---

## 🌐 STUN/TURN 服务器配置

```javascript
const configuration = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302'  // Google 免费 STUN
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    },
    // 如果需要 TURN 服务器（NAT 穿透）
    // {
    //   urls: 'turn:your-turn-server.com:3478',
    //   username: 'user',
    //   credential: 'pass'
    // }
  ]
};
```

---

## ⚠️ 重要注意事项

### 1. 开发环境要求

使用 Expo Dev Client 后：
- ❌ 不能再使用 Expo Go
- ✅ 需要构建自定义开发客户端
- ✅ Android 需要 Android Studio
- ✅ iOS 需要 Xcode（仅 macOS）

### 2. 构建时间

首次构建可能需要：
- Android: 5-10 分钟
- iOS: 10-20 分钟

### 3. 测试要求

- 需要两台真机或模拟器
- 或者一台真机 + 一个模拟器
- 不能用 Expo Go 测试

---

## 🤔 是否值得实施？

### 适合实施的情况

- ✅ 语音通话是核心功能
- ✅ 愿意配置开发环境
- ✅ 需要真正的 P2P 通话

### 不适合的情况

- ❌ 只是想快速原型验证
- ❌ 不想配置 native 开发环境
- ❌ 可以接受使用第三方服务（如 Agora）

---

## 🚀 下一步行动

**选项 A**: 继续使用 Expo Dev Client 实现 WebRTC ⭐ 推荐
- 功能完整
- 性能好
- 真正的 P2P

**选项 B**: 使用第三方服务（Agora / Twilio）
- 快速实现
- 无需复杂配置
- 需要付费

**选项 C**: 暂缓语音通话，先完善其他功能
- 继续优化现有功能
- 添加其他特性

---

**你想选择哪个方案？** 🤔

如果选择方案 A（Expo Dev Client + WebRTC），我可以立即开始配置和开发。

