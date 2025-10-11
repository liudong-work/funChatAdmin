# 🚀 应用运行指南

## 当前运行状态

### ✅ 后端服务器（数据库版本）
- **地址**: `http://0.0.0.0:8889`
- **WebSocket**: `ws://0.0.0.0:8889`
- **数据库**: MySQL (drift_bottle)
- **状态**: ✅ 运行中

### ✅ 前端应用（Expo）
- **状态**: ✅ 运行中
- **Metro Bundler**: 已启动

---

## 📱 在手机上运行应用

### 方式1：使用Expo Go扫码（推荐）

1. **下载Expo Go应用**
   - iOS: 从App Store下载 "Expo Go"
   - Android: 从Google Play下载 "Expo Go"

2. **扫描二维码**
   - 打开你的终端窗口（运行`npx expo start`的窗口）
   - 你会看到一个二维码
   - 在手机上打开Expo Go应用
   - iOS: 使用相机扫描二维码
   - Android: 在Expo Go中点击"Scan QR Code"

3. **等待加载**
   - 应用会自动下载并运行
   - 首次加载可能需要几分钟

### 方式2：通过浏览器

1. 在浏览器中访问终端显示的URL（通常是 `http://localhost:8081`）
2. 在Expo Go中扫描网页上的二维码

### 方式3：手动输入（如果扫码失败）

1. 在Expo Go中选择"Enter URL manually"
2. 输入终端显示的exp://地址

---

## 🔧 如果遇到问题

### 问题1: 手机无法连接到服务器

**解决方案**:
```bash
# 1. 确保手机和电脑在同一WiFi网络
# 2. 检查你的IP地址
ifconfig | grep "inet " | grep -v 127.0.0.1

# 3. 更新config/api.js中的IP地址
# 将BASE_URL改为你的实际IP地址
```

### 问题2: Expo服务器未启动

**解决方案**:
```bash
# 重新启动Expo
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
npx expo start
```

### 问题3: 后端服务器未运行

**解决方案**:
```bash
# 启动数据库版本服务器
cd backend
node src/server-with-db.js

# 或使用启动脚本
./start-db-server.sh
```

### 问题4: 缓存问题

**解决方案**:
```bash
# 清除缓存并重新启动
npx expo start --clear
```

---

## 🎯 测试应用功能

### 1. 注册/登录
- 打开应用
- 输入手机号（如：13800138001）
- 输入验证码：`123456`（测试用）
- 点击登录

### 2. 查看动态
- 登录后会进入动态页面
- 可以切换"最新"和"关注"标签
- 点击动态卡片查看详情

### 3. 发布动态
- 点击右下角的"+"按钮
- 输入动态内容
- 可以选择添加图片
- 点击发布

### 4. 关注用户
- 进入其他用户的主页
- 点击"关注"按钮
- 在"关注"标签下可以看到关注用户的动态

### 5. 查看个人资料
- 点击底部导航的"我的"
- 查看个人信息、关注数、粉丝数
- 点击"编辑"可以修改个人信息

### 6. 私聊消息
- 点击底部导航的"消息"
- 查看对话列表
- 点击对话进入聊天界面
- 发送文本、图片、语音消息

---

## 🗄️ 查看数据库数据

### 方法1: 使用查看脚本
```bash
cd backend
node view-data.js
```

### 方法2: 使用MySQL命令
```bash
# 查看所有用户
/usr/local/mysql/bin/mysql -u root -p12345678 drift_bottle -e "SELECT id, uuid, phone, nickname FROM users;"

# 查看所有动态
/usr/local/mysql/bin/mysql -u root -p12345678 drift_bottle -e "SELECT id, uuid, content, likes_count, comments_count FROM moments;"

# 查看关注关系
/usr/local/mysql/bin/mysql -u root -p12345678 drift_bottle -e "SELECT * FROM follows WHERE status='active';"
```

### 方法3: 使用图形界面工具
- **MySQL Workbench** (官方)
- **Sequel Pro** (Mac)
- **TablePlus** (Mac)
- **DBeaver** (跨平台)

连接信息:
- 主机: `127.0.0.1`
- 端口: `3306`
- 用户名: `root`
- 密码: `12345678`
- 数据库: `drift_bottle`

---

## 📊 实时监控

### 查看后端日志
```bash
tail -f backend/logs/drift-bottle.log
```

### 查看Expo日志
- Expo的日志会直接显示在运行`npx expo start`的终端中
- 或在浏览器的Expo Dev Tools中查看

---

## 🛑 停止应用

### 停止前端
```bash
# 在运行npx expo start的终端中按 Ctrl+C
```

### 停止后端
```bash
# 停止所有后端服务器
pkill -f "node src/server"
```

---

## 🔄 重启应用

### 完整重启
```bash
# 1. 停止所有服务
pkill -f "node src/server"
pkill -f "expo start"

# 2. 启动后端
cd backend
node src/server-with-db.js &

# 3. 启动前端
cd ..
npx expo start
```

---

## 📝 常用命令

```bash
# 启动后端（数据库版本）
cd backend && node src/server-with-db.js

# 启动后端（内存版本）
cd backend && node src/server-simple.js

# 启动前端
npx expo start

# 清除缓存启动
npx expo start --clear

# 查看数据库数据
cd backend && node view-data.js

# 初始化数据库
cd backend && node init-database.js

# 查看日志
tail -f backend/logs/drift-bottle.log
```

---

## 🎉 下一步

现在你可以：

1. ✅ 在手机上打开应用
2. ✅ 注册/登录账号
3. ✅ 发布动态
4. ✅ 关注其他用户
5. ✅ 发送私聊消息
6. ✅ 查看数据库中的数据

所有操作都会自动保存到MySQL数据库中！

---

## 💡 提示

- 确保手机和电脑在同一WiFi网络
- 如果IP地址变化，需要更新`config/api.js`
- 数据库密码在`backend/.env`文件中
- 所有数据都会持久化保存，服务器重启后数据不丢失

祝你使用愉快！🚀

