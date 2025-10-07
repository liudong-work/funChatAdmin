# 🔨 真机客户端构建步骤

## ✅ 前置准备已完成

- ✅ EAS CLI 已安装
- ✅ 代码已准备好
- ✅ eas.json 配置已创建
- ✅ 权限配置已完成

---

## 📝 构建步骤（请按顺序执行）

### 第一步：登录 Expo 账号

**在你的 Mac 终端运行**：

```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
eas login
```

**如果还没有 Expo 账号**：
1. 访问 https://expo.dev/signup
2. 注册一个免费账号
3. 记住用户名和密码

**登录时会要求输入**：
- Email or username（邮箱或用户名）
- Password（密码）

---

### 第二步：配置项目（首次需要）

```bash
eas build:configure
```

会自动创建必要的配置文件（我们已经创建了 eas.json，所以这步可能会跳过）。

---

### 第三步：开始构建

```bash
eas build --profile development --platform android
```

**构建过程**：
1. ✅ 上传代码到 Expo 服务器
2. ✅ 在云端编译 Android APK
3. ⏱️ 等待 10-20 分钟
4. 📦 获得下载链接

**期间会问的问题**：
- `Generate a new Android Keystore?` → 选择 `Yes`（首次构建）
- 其他默认选择即可

---

### 第四步：下载 APK

构建完成后，终端会显示：

```
✔ Build finished

🎉 Build successful!

Artifact page: https://expo.dev/accounts/YOUR_USERNAME/projects/chat-mobile-demo/builds/xxx

Download: https://expo.dev/artifacts/xxx.apk
```

**下载方式**：

**方式 A**（推荐）:
- 在 Android 手机浏览器打开下载链接
- 直接下载 APK

**方式 B**:
- 在电脑下载 APK
- 通过 USB 传到手机
- 或使用 AirDrop/微信等传输

---

### 第五步：安装 APK

1. 在 Android 手机上找到下载的 APK 文件
2. 点击安装
3. 如果提示"不允许安装未知应用"：
   - 设置 → 安全 → 允许安装未知应用
   - 选择你使用的浏览器或文件管理器
   - 允许来自此来源的安装
4. 继续安装

---

### 第六步：启动开发服务器

**在你的 Mac 终端运行**：

```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
npx expo start --dev-client
```

---

### 第七步：连接应用

1. 在手机上打开刚安装的 "chat-mobile-demo" 应用
2. 会看到一个扫码界面（类似 Expo Go）
3. 扫描 Mac 终端显示的二维码
4. 应用开始加载
5. 完成！✅

---

## 🧪 测试语音通话

### 准备两台设备

**设备 A**（发起方）:
- 安装自定义开发客户端
- 登录账号：13800138001

**设备 B**（接收方）:
- 安装自定义开发客户端
- 登录账号：13800138002

### 测试流程

1. **设备 A**: 进入与账号 B 的聊天
2. **设备 A**: 点击标题栏 📞 按钮
3. **设备 A**: 看到"正在呼叫..."界面
4. **设备 B**: 自动弹出来电界面
5. **设备 B**: 点击绿色"接听"按钮
6. **双方**: 进入通话中状态，开始语音通话！🎙️
7. **测试**: 
   - 说话测试（能听到对方声音）
   - 点击静音（对方听不到）
   - 点击扬声器
   - 点击挂断

---

## 💡 常见问题

### Q: 构建需要多久？
A: 通常 10-20 分钟，取决于 Expo 服务器的负载。

### Q: 构建失败怎么办？
A: 查看错误信息，通常是配置问题。可以重新运行构建命令。

### Q: 需要付费吗？
A: Expo 免费账号每月有一定的构建额度，足够开发使用。

### Q: 可以在 iOS 上测试吗？
A: 可以，但需要 Apple 开发者账号（$99/年）。命令改为：
   `eas build --profile development --platform ios`

### Q: 只有一台手机怎么办？
A: 可以用手机 + Android 模拟器测试。

---

## 🎯 准备好了就开始吧！

**在终端运行**：

```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo
eas login
eas build --profile development --platform android
```

**我已经帮你准备好了一切，代码完全就绪！** 🚀

