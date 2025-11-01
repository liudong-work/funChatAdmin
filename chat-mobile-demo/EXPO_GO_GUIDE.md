# 📱 Expo Go 使用指南

## ✅ 当前状态

所有服务已成功启动：

- ✅ **后端服务**: http://localhost:8889
- ✅ **Elasticsearch**: http://localhost:9200  
- ✅ **Expo Metro Bundler**: http://localhost:8081
- ✅ **本机 IP**: 192.168.1.6

---

## 🚀 方法 1：使用 Expo Go 手机应用（推荐）

### 步骤：

1. **在手机上下载 Expo Go**
   - iOS: App Store 搜索 "Expo Go"
   - Android: Google Play 搜索 "Expo Go"

2. **确保手机和电脑在同一 WiFi 网络**

3. **在 Expo Go 中输入以下地址**：
   ```
   exp://192.168.1.6:8081
   ```

4. **或者扫描 QR 码**
   - 在新终端中运行: `./start-expo.sh`
   - 使用 Expo Go 扫描显示的 QR 码

---

## 🖥️ 方法 2：使用浏览器查看

访问 Expo 开发工具：
```
http://localhost:8081
```

在此页面可以：
- 查看项目信息
- 生成 QR 码
- 查看日志
- 打开 iOS/Android 模拟器

---

## 📱 方法 3：使用模拟器

### iOS 模拟器:
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
npx expo start --ios
```

### Android 模拟器:
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
npx expo start --android
```

---

## 🔧 查看实时日志

在新终端窗口中运行：

```bash
# 查看 Expo 日志
tail -f /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/expo.log

# 查看后端日志
tail -f /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/server.log
```

---

## 📊 服务管理命令

```bash
# 查看所有运行的服务
ps aux | grep -E "(expo|server-with-db|elasticsearch)" | grep -v grep

# 停止 Expo
pkill -f "expo start"

# 停止后端
pkill -f "server-with-db"

# 停止所有服务
bash stop-all-services.sh
```

---

## 🎯 快速启动命令

如果需要重新启动 Expo（在新终端窗口）：

```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
./start-expo.sh
```

---

## 📱 Expo Go 连接 URL

手机和电脑在同一网络时，在 Expo Go 中输入：

```
exp://192.168.1.6:8081
```

或

```
http://192.168.1.6:8081
```

---

## 🐛 故障排除

### 如果无法连接：

1. **检查防火墙设置**
   - 确保端口 8081 未被阻止

2. **确认网络连接**
   - 手机和电脑必须在同一 WiFi

3. **重启 Expo**
   ```bash
   pkill -f "expo start"
   ./start-expo.sh
   ```

4. **清除缓存**
   ```bash
   npx expo start --clear
   ```

---

## ✨ 开始使用

现在您可以：
1. 在 Expo Go 中输入 URL: `exp://192.168.1.6:8081`
2. 或者在浏览器访问: http://localhost:8081
3. 开始测试您的聊天应用！

祝您开发愉快！🎉

