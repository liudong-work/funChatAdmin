# 📱 Chat Mobile Demo - 项目结构文档

## 🎯 项目概述

一个基于 React Native + Expo + Node.js 的即时通讯应用，支持文本、语音、图片消息，以及漂流瓶社交功能。

---

## 📂 项目目录结构

```
chat-mobile-demo/
│
├── 📱 前端代码 (React Native + Expo)
│   ├── App.js                      # 应用入口，WebSocket 全局管理
│   ├── LoginScreen.js              # 登录页面
│   ├── RegisterScreen.js           # 注册页面
│   ├── HomeScreen.js               # 首页（漂流瓶功能）
│   ├── MessagesScreen.js           # 消息列表页面
│   ├── ChatDetailScreen.js         # 聊天详情页面 ⭐核心
│   ├── ProfileScreen.js            # 个人中心页面
│   ├── ChatScreen.js               # 旧版聊天页面
│   └── SimpleChatScreen.js         # 简化聊天页面
│
├── ⚙️ 配置 & 服务
│   ├── config/
│   │   └── api.js                  # API 和 WebSocket 地址配置
│   ├── services/
│   │   └── apiService.js           # API 请求封装服务
│   ├── app.json                    # Expo 应用配置
│   ├── package.json                # 前端依赖管理
│   └── index.js                    # Expo 入口文件
│
├── 🎨 资源文件
│   └── assets/
│       ├── icon.png                # 应用图标
│       ├── adaptive-icon.png       # 自适应图标
│       ├── splash-icon.png         # 启动画面
│       └── favicon.png             # 网页图标
│
├── 🖥️ 后端服务 (Node.js + Express + Socket.IO)
│   └── backend/
│       ├── src/
│       │   ├── server-simple.js        # 简化版服务器 ⭐当前使用
│       │   ├── server.js               # 完整版服务器
│       │   │
│       │   ├── config/                 # 配置目录
│       │   │   ├── config.js           # 应用配置（端口、环境等）
│       │   │   ├── logger.js           # 日志配置
│       │   │   └── database.js         # 数据库配置
│       │   │
│       │   ├── middleware/             # 中间件
│       │   │   ├── auth.js             # JWT 认证中间件
│       │   │   └── cors.js             # CORS 跨域配置
│       │   │
│       │   ├── models/                 # 数据模型
│       │   │   ├── User.js             # 用户模型
│       │   │   ├── Bottle.js           # 漂流瓶模型
│       │   │   └── index.js            # 模型导出
│       │   │
│       │   ├── controllers/            # 控制器层
│       │   │   └── userController.js   # 用户控制器
│       │   │
│       │   ├── routes/                 # 路由层
│       │   │   └── user.js             # 用户路由
│       │   │
│       │   ├── services/               # 服务层
│       │   │   └── userService.js      # 用户服务
│       │   │
│       │   └── socket/                 # WebSocket 处理（未使用）
│       │
│       ├── uploads/                    # 📁 上传文件存储
│       │   ├── img-*.jpeg              # 用户上传的图片
│       │   ├── img-*.png               # 用户上传的图片
│       │   └── voice-*.m4a             # 用户录制的语音
│       │
│       ├── logs/                       # 📝 日志文件
│       │   ├── drift-bottle.log        # 应用运行日志
│       │   └── drift-bottle-error.log  # 错误日志
│       │
│       ├── package.json                # 后端依赖管理
│       ├── .env                        # 环境变量配置
│       └── env-template.txt            # 环境变量模板
│
└── 📄 文档
    ├── README.md                   # 项目说明文档
    ├── IMAGE_FEATURE_TEST.md       # 图片功能测试文档
    ├── PROJECT_STRUCTURE.md        # 项目结构文档（本文件）
    └── view-logs.sh                # 日志查看脚本

```

---

## 🔑 核心文件说明

### 前端核心文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `ChatDetailScreen.js` | 1033 | 聊天详情页面，包含文本/语音/图片消息的收发 |
| `App.js` | 374 | 应用入口，WebSocket 连接和全局消息处理 |
| `MessagesScreen.js` | - | 消息列表，显示所有对话 |
| `HomeScreen.js` | - | 首页，漂流瓶功能 |

### 后端核心文件

| 文件 | 行数 | 说明 |
|------|------|------|
| `server-simple.js` | 980 | 简化版服务器，内存存储，包含所有功能 |
| `config/config.js` | - | 配置管理（端口、环境、WebSocket等） |
| `middleware/cors.js` | - | CORS 和请求日志中间件 |

---

## 🌐 服务地址

| 服务 | 地址 | 说明 |
|------|------|------|
| HTTP API | `http://192.168.1.6:8889` | RESTful API 服务 |
| WebSocket | `ws://192.168.1.6:8889` | 实时消息推送 |
| Expo Metro | `http://192.168.1.6:8081` | Expo 开发服务器 |

---

## 📊 统计数据

- **总代码行数**: ~3,919 行
- **前端文件**: 10 个 JS 文件
- **后端文件**: 13 个 JS 文件
- **依赖包**: 63 个
- **已上传图片**: 8 张

---

## 🚀 Git 分支

| 分支 | 状态 | 功能 |
|------|------|------|
| `main` | ✅ 稳定 | 主分支 |
| `feature/voice-message` | ✅ 已完成 | 语音消息功能 |
| `feature/image-upload` | ✅ 已完成 | 图片消息功能（当前） |

---

## 🔧 快速命令

### 启动服务
```bash
# 启动后端
cd backend && node src/server-simple.js

# 启动前端
npx expo start --clear
```

### 查看日志
```bash
# 实时查看后端日志
tail -f backend/logs/drift-bottle.log

# 查看错误日志
tail -f backend/logs/drift-bottle-error.log
```

### Git 操作
```bash
# 查看状态
git status

# 提交代码
git add .
git commit -m "message"
git push origin feature/image-upload
```

---

## 📝 开发日志

- ✅ 2025-10-07: 完成图片消息功能
- ✅ 2025-10-07: 完成语音消息功能
- ✅ 2025-10-07: 优化消息对齐逻辑
- ✅ 2025-10-07: WebSocket 性能优化

---

**更新时间**: 2025-10-07  
**当前版本**: v1.2.0 (图片消息功能)
