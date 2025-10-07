# 🎙️ 语音通话功能实现计划

## 📖 参考项目
[kone-net/go-chat](https://github.com/kone-net/go-chat) - 基于 WebRTC 的 P2P 语音/视频通话实现

---

## 🎯 功能目标

实现基于 WebRTC 的点对点（P2P）语音通话功能，支持：
- 📞 发起语音通话
- 📱 接听/拒绝通话
- 🔇 静音/取消静音
- 🔊 扬声器/听筒切换
- ⏱️ 通话时长显示
- 📴 挂断通话

---

## 🔧 技术方案

### 核心技术栈

#### 前端 (React Native + Expo)
- **react-native-webrtc** - WebRTC 实现库
  - 注意：需要检查 Expo 兼容性
  - 如果不兼容，可能需要使用 Expo 的 bare workflow 或 expo-dev-client

#### 后端 (Node.js + Socket.IO)
- 基于现有的 WebSocket 服务器
- 实现 WebRTC 信令服务器
- 处理 SDP (Session Description Protocol) 交换
- 处理 ICE (Interactive Connectivity Establishment) 候选者交换

### WebRTC 架构

```
发起方 (Caller)                信令服务器               接收方 (Callee)
     |                              |                          |
     |-- 1. 发起通话请求 ---------->|                          |
     |                              |-- 2. 转发通话请求 ------>|
     |                              |                          |
     |                              |<-- 3. 接受/拒绝 ---------|
     |<-- 4. 转发响应 --------------|                          |
     |                              |                          |
     |-- 5. 发送 Offer (SDP) ------>|                          |
     |                              |-- 6. 转发 Offer -------->|
     |                              |                          |
     |                              |<-- 7. 发送 Answer (SDP) -|
     |<-- 8. 转发 Answer -----------|                          |
     |                              |                          |
     |-- 9. 交换 ICE 候选者 ------->|<-- ICE 候选者 -----------|
     |                              |                          |
     |<=========== P2P 音频流 ========================>|
                      (建立直连后)
```

---

## 📝 实现步骤

### 第一阶段：环境准备

- [ ] 1.1 调研 react-native-webrtc 与 Expo 的兼容性
- [ ] 1.2 如需要，配置 expo-dev-client 或切换到 bare workflow
- [ ] 1.3 安装 react-native-webrtc 依赖
- [ ] 1.4 配置权限（麦克风、通知）

### 第二阶段：后端信令服务器

- [ ] 2.1 定义 WebRTC 信令协议
  - `call_offer` - 发起通话
  - `call_answer` - 接受通话
  - `call_reject` - 拒绝通话
  - `call_hangup` - 挂断通话
  - `ice_candidate` - ICE 候选者交换
  - `sdp_offer` - SDP Offer
  - `sdp_answer` - SDP Answer

- [ ] 2.2 实现信令转发逻辑
- [ ] 2.3 添加通话状态管理
- [ ] 2.4 添加详细日志

### 第三阶段：前端 UI 设计

- [ ] 3.1 通话发起按钮（聊天页面）
- [ ] 3.2 来电提示界面
  - 来电铃声
  - 接听/拒绝按钮
  - 对方信息显示

- [ ] 3.3 通话中界面
  - 通话时长显示
  - 对方头像/名称
  - 静音按钮
  - 扬声器按钮
  - 挂断按钮

### 第四阶段：WebRTC 连接实现

- [ ] 4.1 初始化 RTCPeerConnection
- [ ] 4.2 配置 ICE 服务器 (STUN/TURN)
- [ ] 4.3 获取本地音频流
- [ ] 4.4 创建和发送 SDP Offer
- [ ] 4.5 处理 SDP Answer
- [ ] 4.6 交换 ICE 候选者
- [ ] 4.7 建立 P2P 连接
- [ ] 4.8 播放远程音频流

### 第五阶段：通话状态管理

- [ ] 5.1 实现状态机
  - IDLE（空闲）
  - CALLING（呼叫中）
  - RINGING（响铃中）
  - CONNECTED（通话中）
  - ENDED（已结束）

- [ ] 5.2 状态转换逻辑
- [ ] 5.3 超时处理（无人接听）
- [ ] 5.4 异常处理（连接失败、对方忙）

### 第六阶段：通话控制功能

- [ ] 6.1 静音/取消静音
- [ ] 6.2 扬声器/听筒切换
- [ ] 6.3 挂断通话
- [ ] 6.4 通话时长计时器

### 第七阶段：测试和优化

- [ ] 7.1 本地网络测试
- [ ] 7.2 不同网络环境测试
- [ ] 7.3 音质优化
- [ ] 7.4 性能优化
- [ ] 7.5 错误处理完善

---

## 🚨 技术挑战

### 1. Expo 兼容性问题

**问题**: `react-native-webrtc` 可能不支持 Expo managed workflow

**解决方案**:
- 方案A: 使用 expo-dev-client (Custom Development Client)
- 方案B: 切换到 bare workflow (`expo eject`)
- 方案C: 寻找 Expo 兼容的 WebRTC 替代方案

### 2. ICE 服务器配置

**需要配置**:
- **STUN 服务器** - 用于发现公网 IP（免费公共服务器）
  - `stun:stun.l.google.com:19302`
  - `stun:stun1.l.google.com:19302`

- **TURN 服务器** - 用于 NAT 穿透（需要自建或购买服务）
  - 如果 P2P 连接失败，需要通过中继服务器转发

### 3. 音频权限

需要在 `app.json` 中添加：
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "需要访问麦克风以进行语音通话"
      }
    },
    "android": {
      "permissions": [
        "RECORD_AUDIO",
        "MODIFY_AUDIO_SETTINGS"
      ]
    }
  }
}
```

---

## 📚 参考资源

### go-chat 项目关键代码

1. **WebRTC 连接建立** - `go-chat-web` 前端代码
2. **信令服务器实现** - `go-chat` 后端 WebSocket 处理
3. **视频通话组件** - `VideoCall.js` 参考

### WebRTC 文档
- [WebRTC MDN 文档](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [react-native-webrtc GitHub](https://github.com/react-native-webrtc/react-native-webrtc)

---

## 🎬 快速开始

### 第一步：检查 Expo 兼容性

```bash
# 检查当前 Expo SDK 版本
npx expo --version

# 尝试安装 react-native-webrtc
npx expo install react-native-webrtc
```

如果不兼容，可能需要：
```bash
# 安装 expo-dev-client
npx expo install expo-dev-client

# 重新构建
npx expo prebuild
```

---

## 💡 实现建议

### MVP (最小可行产品) 功能

先实现最基础的功能：
1. ✅ 发起语音通话
2. ✅ 接听通话
3. ✅ 挂断通话
4. ✅ 基本音频传输

### 后续优化功能

- 静音控制
- 扬声器切换
- 通话时长显示
- 通话记录
- 来电铃声
- 网络质量指示

---

**文档创建时间**: 2025-10-07  
**目标完成时间**: TBD  
**参考项目**: [kone-net/go-chat](https://github.com/kone-net/go-chat)

