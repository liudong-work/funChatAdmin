# 🎙️ 真实语音通话功能测试指南

## 📋 概述

本文档说明如何测试真实的 WebRTC 语音通话功能。

---

## ✅ 已完成的优化

### 1. **真实 WebRTC 音频流处理** ✅
- ✅ 启用真实的 `webrtcService.js`（替代 MockWebRTCService）
- ✅ 使用 `react-native-webrtc` 进行 P2P 音频连接
- ✅ 完整的 SDP Offer/Answer 交换
- ✅ ICE 候选者收集和交换

### 2. **麦克风权限管理** ✅
- ✅ iOS 权限配置：`NSMicrophoneUsageDescription`
- ✅ Android 权限配置：`RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- ✅ 权限检查方法：`checkMicrophonePermission()`
- ✅ 友好的错误提示（权限被拒绝、设备未找到等）

### 3. **音频质量优化** ✅
- ✅ **回声消除**（Echo Cancellation）
- ✅ **噪音抑制**（Noise Suppression）
- ✅ **自动增益控制**（Auto Gain Control）
- ✅ 高采样率：48000 Hz
- ✅ 单声道（减少带宽）
- ✅ 语音活动检测（VAD）
- ✅ 多个 STUN 服务器（提高连接成功率）
- ✅ 优化的 ICE 候选池大小

### 4. **代码优化** ✅
- ✅ 完善的错误处理和日志
- ✅ 连接状态监控
- ✅ 资源清理机制
- ✅ 重置和重连逻辑

---

## 🔧 构建真机测试包

### 方法 1：使用 EAS Build（推荐）

#### iOS 构建
```bash
# 安装 EAS CLI
npm install -g eas-cli

# 登录 Expo 账号
eas login

# 构建 iOS 开发版本
eas build --platform ios --profile development

# 构建成功后，下载 .ipa 文件并安装到手机
```

#### Android 构建
```bash
# 构建 Android 开发版本
eas build --platform android --profile development

# 构建成功后，下载 .apk 文件并安装到手机
```

### 方法 2：本地构建

#### iOS 本地构建
```bash
# 生成 iOS 原生项目
npx expo prebuild --platform ios

# 打开 Xcode 项目
cd ios
open chatmobiledemo.xcworkspace

# 在 Xcode 中：
# 1. 选择你的开发团队
# 2. 连接 iPhone 设备
# 3. 点击 Run 按钮构建并安装
```

#### Android 本地构建
```bash
# 生成 Android 原生项目
npx expo prebuild --platform android

# 构建 APK
cd android
./gradlew assembleDebug

# 生成的 APK 位置：
# android/app/build/outputs/apk/debug/app-debug.apk

# 安装到连接的 Android 设备
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## 🧪 测试步骤

### 准备工作

1. **准备两台真机设备**
   - 两台 iOS 设备，或
   - 两台 Android 设备，或
   - 一台 iOS + 一台 Android

2. **确保网络连接**
   - 两台设备连接到同一 Wi-Fi 网络（测试局域网连接）
   - 或使用移动数据（测试互联网连接）

3. **启动后端服务器**
   ```bash
   cd backend
   node src/server-simple.js
   ```
   
   确保服务器可以被设备访问（如果不在同一网络，需要公网 IP）

### 测试场景

#### 测试 1：基本语音通话
1. 在设备 A 上登录账号 A
2. 在设备 B 上登录账号 B
3. 在设备 A 上进入与账号 B 的聊天
4. 点击右上角的 📞 通话按钮
5. 设备 B 应收到来电通知
6. 设备 B 点击接听
7. **预期结果**：
   - ✅ 通话状态变为"通话中"
   - ✅ 通话时长开始计时
   - ✅ 双方可以听到对方的声音
   - ✅ 音质清晰，无明显延迟

#### 测试 2：静音功能
1. 在通话中，点击 🎤 静音按钮
2. **预期结果**：
   - ✅ 按钮变为 🔇
   - ✅ 对方听不到你的声音
   - ✅ 你仍然可以听到对方的声音
3. 再次点击恢复
4. **预期结果**：
   - ✅ 对方可以再次听到你的声音

#### 测试 3：拒绝通话
1. 设备 A 发起通话
2. 设备 B 收到来电后点击拒绝
3. **预期结果**：
   - ✅ 设备 A 显示"通话被拒绝"
   - ✅ 设备 B 返回聊天页面
   - ✅ 无音频资源泄漏

#### 测试 4：挂断通话
1. 建立通话后，任意一方点击挂断
2. **预期结果**：
   - ✅ 双方通话结束
   - ✅ 双方返回聊天页面
   - ✅ 音频流正确释放

#### 测试 5：网络切换
1. 在通话中，切换网络（Wi-Fi ↔ 移动数据）
2. **预期结果**：
   - ✅ 通话自动重连
   - ✅ 或显示连接失败提示

#### 测试 6：后台切换
1. 在通话中，切换到后台
2. **预期结果**：
   - ✅ 通话继续进行
   - ✅ 音频正常
3. 返回应用
4. **预期结果**：
   - ✅ 通话状态正常显示

---

## 🐛 常见问题排查

### 问题 1：麦克风权限被拒绝
**错误信息**：`麦克风权限被拒绝，请在设置中允许应用访问麦克风`

**解决方案**：
- iOS: 设置 → 隐私 → 麦克风 → 允许应用访问
- Android: 设置 → 应用 → 权限 → 麦克风 → 允许

### 问题 2：无法建立连接
**症状**：通话一直显示"连接中"

**可能原因**：
1. 网络防火墙阻止 WebRTC 连接
2. STUN 服务器无法访问
3. 对方设备离线

**解决方案**：
1. 检查网络连接
2. 尝试切换网络
3. 查看控制台日志：
   ```bash
   # iOS
   在 Safari → 开发 → 设备名 → Web Inspector

   # Android
   chrome://inspect
   ```

### 问题 3：音质差或有延迟
**可能原因**：
1. 网络带宽不足
2. 网络延迟高
3. 设备性能不足

**解决方案**：
1. 切换到更好的网络
2. 关闭其他占用带宽的应用
3. 检查服务器性能

### 问题 4：听不到对方声音
**可能原因**：
1. 静音按钮被按下
2. 扬声器音量为 0
3. 远程音频流未正确建立

**解决方案**：
1. 检查静音状态
2. 调高音量
3. 查看日志中的 "收到远程音频流" 信息

---

## 📊 性能指标

### 音频质量指标
- **采样率**：48000 Hz
- **位深**：16 bit
- **声道**：单声道
- **编解码器**：Opus（自动选择）
- **比特率**：32-64 kbps（自适应）

### 连接指标
- **建立时间**：< 3 秒
- **端到端延迟**：< 200ms（局域网）
- **端到端延迟**：< 500ms（互联网）

---

## 📝 日志分析

### 正常通话日志流程

**发起方（设备 A）**：
```
[WebRTC] 服务初始化完成
[WebRTC] 请求本地音频流（高质量配置）...
[WebRTC] 本地音频流获取成功
[WebRTC] 创建 PeerConnection...
[WebRTC] 创建 Offer...
[WebRTC] Offer 创建成功
[WebRTC] 收到 Answer...
[WebRTC] Answer 处理成功
[WebRTC] ICE 连接状态: connected
```

**接收方（设备 B）**：
```
[WebRTC] 收到来电
[WebRTC] 请求本地音频流（高质量配置）...
[WebRTC] 本地音频流获取成功
[WebRTC] 处理 Offer...
[WebRTC] Answer 创建成功
[WebRTC] 收到远程音频流
[WebRTC] ICE 连接状态: connected
```

---

## ✅ 测试检查清单

- [ ] iOS 真机测试
- [ ] Android 真机测试
- [ ] 跨平台测试（iOS ↔ Android）
- [ ] Wi-Fi 网络测试
- [ ] 移动数据网络测试
- [ ] 静音功能测试
- [ ] 扬声器功能测试
- [ ] 拒绝通话测试
- [ ] 挂断通话测试
- [ ] 网络切换测试
- [ ] 后台切换测试
- [ ] 长时间通话测试（> 5 分钟）
- [ ] 音频质量评估
- [ ] 延迟测试

---

## 🎯 下一步优化

1. **添加 TURN 服务器**（用于 NAT 穿透）
2. **网络质量监控**（实时显示延迟、丢包率）
3. **通话录音功能**
4. **多人通话**（群组语音）
5. **视频通话**
6. **音频效果**（变声、降噪等级调整）

---

**测试完成后，请记录测试结果并提交反馈！** 🚀

