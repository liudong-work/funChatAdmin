# 漂流瓶聊天应用 (FunnyChat)

一个基于React Native和Expo开发的移动端聊天应用，具有独特的"漂流瓶"陌生人匹配功能。

## 🌊 功能特色

### 🏠 首页 - 漂流瓶匹配
- **扔瓶子**: 分享心情，等待陌生人回应
- **捞瓶子**: 随机捞取陌生人的心情瓶
- **海洋主题**: 精美的海洋背景和动画效果
- **心情分享**: 匿名分享你的心情和想法

### 💬 消息 - 聊天功能
- **用户列表**: 查看所有聊天用户
- **实时聊天**: 支持文字消息发送
- **消息气泡**: 美观的聊天气泡设计
- **键盘适配**: 完美的键盘弹出适配，无遮挡问题

### 👤 我的 - 个人中心
- **个人信息**: 查看个人资料
- **头像设置**: 个性化头像选择
- **设置选项**: 应用相关设置

## 🛠 技术栈

- **框架**: React Native + Expo
- **导航**: React Navigation (Bottom Tabs + Stack)
- **平台**: iOS & Android
- **开发工具**: Expo Go
- **版本控制**: Git + GitHub

## 📱 项目结构

```
chat-mobile-demo/
├── App.js                 # 主应用入口
├── HomeScreen.js          # 首页 - 漂流瓶功能
├── MessagesScreen.js      # 消息列表页
├── ChatDetailScreen.js    # 聊天详情页
├── ProfileScreen.js       # 个人中心页
├── package.json           # 项目依赖
├── app.json              # Expo配置
└── README.md             # 项目说明
```

## 🔐 验证码说明

**当前验证码设置**: 固定验证码 `123456`

- 用于注册和登录
- 方便开发和测试
- 后续将接入短信服务
- 详见 `backend/SMS_INTEGRATION_GUIDE.md`

## 🚀 快速开始

### 环境要求
- Node.js 18+
- Expo CLI
- Expo Go App (手机端)

### 安装步骤

1. **克隆项目**
   ```bash
   git clone git@github.com:liudong-work/funnychat.git
   cd funnychat
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npx expo start
   ```

4. **在手机上运行**
   - 安装 Expo Go App
   - 扫描二维码或输入开发服务器地址
   - 在手机上查看应用

## 📸 应用截图

### 首页 - 漂流瓶
- 海洋主题背景
- 扔瓶子/捞瓶子功能按钮
- 浮动瓶子动画效果

### 聊天界面
- 消息气泡设计
- 键盘完美适配
- 实时消息发送

### 个人中心
- 用户信息展示
- 设置选项

## 🔧 核心功能实现

### 键盘适配优化
```javascript
// 动态输入框位置
bottom: keyboardHeight > 0 ? keyboardHeight - 40 : 0

// 消息区域高度计算
const availableHeight = Dimensions.get('window').height - totalHeaderHeight - dynamicInputHeight - (keyboardHeight > 0 ? keyboardHeight - 40 : 0) - 10;
```

### 漂流瓶功能
- 心情分享模态框
- 随机瓶子捞取
- 瓶子详情展示
- 回复功能

## 📦 主要依赖

```json
{
  "@react-navigation/native": "^6.1.7",
  "@react-navigation/bottom-tabs": "^6.5.8",
  "@react-navigation/stack": "^6.3.17",
  "react-native-screens": "~3.22.0",
  "react-native-safe-area-context": "4.6.3",
  "expo": "~49.0.15",
  "react-native": "0.72.6"
}
```

## 🎨 设计特色

- **海洋主题**: 蓝色渐变背景，营造海洋氛围
- **漂流瓶概念**: 独特的陌生人匹配方式
- **简洁UI**: 现代化的界面设计
- **流畅动画**: 平滑的过渡效果

## 🔄 版本历史

- **v1.0.0** - 初始版本，基础聊天功能
- **v1.1.0** - 添加漂流瓶匹配功能
- **v1.2.0** - 优化键盘适配，修复输入框遮挡问题
- **v1.3.0** - 完善UI设计，添加海洋主题

## 🤝 贡献指南

欢迎提交Issue和Pull Request来改进项目！

## 📄 许可证

MIT License

## 📞 联系方式

- GitHub: [liudong-work](https://github.com/liudong-work)
- 项目地址: [funnychat](https://github.com/liudong-work/funnychat)

---

⭐ 如果这个项目对你有帮助，请给个Star支持一下！
