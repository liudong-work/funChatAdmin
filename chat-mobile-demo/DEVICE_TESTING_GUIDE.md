# 📱 真机测试指南 - Expo Dev Client

## 🎯 概述

使用 Expo Dev Client 后，真机测试分为两个步骤：
1. **一次性**：构建并安装自定义开发客户端到手机
2. **日常开发**：像之前一样扫码加载代码，快速迭代

---

## 🚀 方式 1: EAS Build（推荐，最简单）

### ✅ 优点
- ✅ 无需本地安装 Xcode/Android Studio
- ✅ 在云端构建
- ✅ 支持 iOS 和 Android
- ✅ 配置简单

### 📝 步骤

#### 1. 安装 EAS CLI
```bash
npm install -g eas-cli
```

#### 2. 登录 Expo 账号
```bash
eas login
```

#### 3. 配置项目
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
eas build:configure
```

#### 4. 构建开发客户端

**Android**（推荐先做，更简单）:
```bash
eas build --profile development --platform android
```

**iOS**（需要 Apple 开发者账号）:
```bash
eas build --profile development --platform ios
```

#### 5. 安装到手机

**Android**:
- 构建完成后，会得到一个下载链接
- 在手机浏览器打开链接
- 下载 `.apk` 文件
- 安装（需要允许未知来源）

**iOS**:
- 需要 Apple 开发者账号（$99/年）
- 或者使用 Ad Hoc 分发（需要注册设备 UDID）
- 通过 TestFlight 或直接安装

#### 6. 日常开发测试

**启动开发服务器**:
```bash
npx expo start --dev-client
```

**在手机上**:
1. 打开刚才安装的自定义开发客户端（类似 Expo Go）
2. 扫描二维码
3. 应用自动加载
4. 代码修改后自动刷新 ✅

---

## 🖥️ 方式 2: 本地构建（适合开发者）

### Android 测试

#### 前置要求
- 安装 Android Studio
- 配置 Android SDK
- 启用 USB 调试

#### 步骤
```bash
# 1. 预构建
npx expo prebuild

# 2. 连接手机（USB 调试模式）

# 3. 运行
npx expo run:android

# 应用会自动安装到手机并启动
```

### iOS 测试

#### 前置要求
- macOS 电脑
- 安装 Xcode
- Apple 开发者账号（免费或付费都可以）

#### 步骤
```bash
# 1. 预构建
npx expo prebuild

# 2. 安装 CocoaPods 依赖
cd ios && pod install && cd ..

# 3. 连接 iPhone

# 4. 运行
npx expo run:ios

# 应用会自动安装到 iPhone 并启动
```

---

## 🔄 开发工作流

### 首次设置（一次性）

```bash
# 1. 安装依赖
npx expo install expo-dev-client
npm install react-native-webrtc

# 2. 构建开发客户端（选择一种方式）
# 方式A: EAS Build
eas build --profile development --platform android

# 方式B: 本地构建
npx expo run:android  # 或 run:ios
```

### 日常开发（快速迭代）

```bash
# 1. 启动开发服务器
npx expo start --dev-client

# 2. 在手机的自定义开发客户端中扫码

# 3. 修改代码 → 自动刷新 ✅
# 就像之前使用 Expo Go 一样方便！
```

---

## 📊 对比：Expo Go vs Expo Dev Client

| 特性 | Expo Go | Expo Dev Client |
|------|---------|-----------------|
| 安装方式 | App Store 下载 | 自己构建安装 |
| 支持库 | 仅 Expo SDK | 所有 React Native 库 ✅ |
| WebRTC 支持 | ❌ 不支持 | ✅ 支持 |
| 扫码加载 | ✅ 支持 | ✅ 支持 |
| 热更新 | ✅ 支持 | ✅ 支持 |
| 构建时间 | 无需构建 | 首次需要 5-20 分钟 |
| 日常开发 | 快速 | 快速（一样） |

---

## 💡 推荐流程（Android 优先）

### 第一天：构建开发客户端

```bash
# 1. 安装 EAS CLI
npm install -g eas-cli

# 2. 登录
eas login

# 3. 配置
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
eas build:configure

# 4. 构建 Android 开发客户端
eas build --profile development --platform android
```

**等待 10-20 分钟** → 获得下载链接 → 在 Android 手机安装

### 第二天：开发 WebRTC 功能

```bash
# 启动开发服务器
npx expo start --dev-client

# 在手机的自定义客户端中扫码
# 开始开发语音通话功能
```

---

## 🎯 测试场景

### 单设备测试（开发阶段）
- 使用 Android 模拟器 + Android 真机
- 或 iOS 模拟器 + iPhone

### 双真机测试（最终测试）
- 两台 Android 手机
- 或两台 iPhone
- 或 Android + iPhone（跨平台测试）

---

## ⏱️ 时间预估

| 阶段 | 时间 |
|------|------|
| 首次构建开发客户端 | 10-30 分钟 |
| 安装到手机 | 5 分钟 |
| 开发 WebRTC 功能 | 1-2 天 |
| 测试和优化 | 1 天 |
| **总计** | **2-3 天** |

---

## 🔑 关键点

### ✅ 好消息
1. 只需要**构建一次**开发客户端
2. 之后开发就像使用 Expo Go 一样方便
3. 扫码加载、热更新都支持
4. 不需要每次都重新构建

### ⚠️ 注意事项
1. 首次构建需要等待
2. 如果添加新的 native 依赖，需要重新构建
3. JavaScript 代码修改不需要重新构建

---

## 🚀 准备好开始了吗？

如果你准备好了，我会：

1. ✅ 安装 expo-dev-client
2. ✅ 安装 react-native-webrtc
3. ✅ 配置 app.json 权限
4. ✅ 配置 EAS Build
5. ✅ 开始构建 Android 开发客户端

**你需要的只是**：
- 一个 Expo 账号（免费注册）
- 一台 Android 手机（用于测试）

准备好了吗？我现在开始配置！🎉

