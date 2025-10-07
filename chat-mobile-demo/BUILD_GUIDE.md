# 🔨 构建指南 - Expo Dev Client

## ✅ 已完成的配置

1. ✅ 安装 expo-dev-client
2. ✅ 安装 react-native-webrtc
3. ✅ 配置 app.json 权限
4. ✅ 创建 eas.json 构建配置

---

## 🚀 下一步：构建开发客户端

### 方式 1: 使用 EAS Build（推荐）

#### 前置要求
- Expo 账号（免费注册：https://expo.dev/signup）

#### 步骤

**1. 安装 EAS CLI**
```bash
npm install -g eas-cli
```

**2. 登录 Expo 账号**
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
eas login
```

输入你的 Expo 账号和密码

**3. 构建 Android 开发客户端**
```bash
eas build --profile development --platform android
```

这会：
- 📤 上传代码到 Expo 云服务
- 🔨 在云端构建 APK
- ⏱️ 等待 10-20 分钟
- 📦 获得下载链接

**4. 下载并安装到 Android 手机**
- 构建完成后，终端会显示下载链接
- 在手机浏览器打开链接
- 下载 APK 文件
- 安装（需要允许"未知来源"安装）

---

### 方式 2: 本地构建（需要 Android Studio）

#### 前置要求
- 安装 Android Studio
- 配置 Android SDK
- Java JDK 17+

#### 步骤

**1. 预构建项目**
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
npx expo prebuild
```

这会生成 `android/` 和 `ios/` 目录。

**2. 连接 Android 手机**
- 启用"开发者选项"
- 启用"USB 调试"
- 用 USB 连接手机到电脑

**3. 运行**
```bash
npx expo run:android
```

应用会自动安装到手机并启动。

---

## 📱 日常开发流程

### 一次性：安装开发客户端
使用上面的任一方式构建并安装到手机。

### 每天开发：
```bash
# 1. 启动开发服务器
npx expo start --dev-client

# 2. 在手机打开自定义开发客户端（类似 Expo Go）

# 3. 扫描二维码

# 4. 开发、修改代码、自动刷新 ✅
```

---

## 🎯 验证安装

安装完成后，手机上会有一个应用：
- 名称: "chat-mobile-demo"
- 图标: 你的应用图标
- 功能: 扫码加载代码（和 Expo Go 一样）
- 区别: 支持 WebRTC 等 native 功能

---

## ⚠️ 常见问题

### Q: 构建需要多久？
A: EAS Build 通常需要 10-20 分钟。本地构建首次需要 5-10 分钟。

### Q: 需要付费吗？
A: Expo 免费账号每月有构建额度（够用）。

### Q: 如果添加新依赖怎么办？
A: 如果是 JS 依赖，不需要重新构建。如果是 native 依赖（如新的 native 模块），需要重新构建一次。

### Q: 可以在 iOS 上测试吗？
A: 可以！但需要 Apple 开发者账号（$99/年）或使用模拟器。

---

## 📊 下一步

构建完成并安装到手机后，我们就可以开始开发 WebRTC 语音通话功能了！

功能包括：
- 📞 发起通话按钮
- 📱 来电界面
- 🎙️ 通话中界面
- 🔇 静音控制
- 🔊 扬声器切换
- 📴 挂断功能

---

**准备好了就运行构建命令吧！** 🎉

如果使用 EAS Build:
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

