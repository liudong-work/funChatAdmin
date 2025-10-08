# 后台管理系统部署指南

## 📋 环境要求

### Node.js 版本要求
- **Node.js**: >= 20.19.0 或 >= 22.12.0
- **npm**: >= 8.0.0

### 当前环境
- Node.js: v18.20.8 ❌ (需要升级)
- npm: 10.8.2 ✅

## 🔧 升级 Node.js

### 方法一：使用 nvm (推荐)
```bash
# 安装 nvm (如果未安装)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# 安装并使用 Node.js 20
nvm install 20
nvm use 20

# 验证版本
node -v  # 应该显示 v20.x.x
```

### 方法二：使用 Homebrew (macOS)
```bash
# 更新 Homebrew
brew update

# 安装 Node.js 20
brew install node@20

# 链接到系统
brew link node@20

# 验证版本
node -v  # 应该显示 v20.x.x
```

### 方法三：从官网下载
访问 https://nodejs.org/ 下载并安装 Node.js 20 LTS 版本

## 🚀 启动步骤

### 1. 安装依赖
```bash
cd /Users/liudong/Desktop/myGitProgect/chat-admin-system/frontend
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```

服务器将运行在 http://localhost:5173

### 3. 启动后端服务器
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend
node src/server-simple.js
```

后端服务器将运行在 http://localhost:8889

## 📁 项目结构

```
chat-admin-system/
├── frontend/                    # Vue 3 前端项目
│   ├── src/
│   │   ├── api/                # API接口
│   │   │   └── user.ts         # 用户管理API
│   │   ├── components/         # 公共组件
│   │   ├── layouts/            # 布局组件
│   │   │   └── BasicLayout.vue # 基础布局
│   │   ├── router/             # 路由配置
│   │   │   └── index.ts        # 路由定义
│   │   ├── stores/             # Pinia状态管理
│   │   ├── types/              # TypeScript类型定义
│   │   │   └── user.ts         # 用户类型
│   │   ├── utils/              # 工具函数
│   │   │   └── request.ts      # API请求封装
│   │   └── views/              # 页面组件
│   │       ├── Login.vue       # 登录页
│   │       ├── Dashboard.vue   # 仪表盘
│   │       └── UserManagement.vue  # 用户管理
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## 🔗 API端点

### 用户管理API
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/users/:id` - 获取用户详情
- `PUT /api/admin/users/:id` - 更新用户信息
- `PUT /api/admin/users/:id/status` - 更新用户状态
- `DELETE /api/admin/users/:id` - 删除用户
- `POST /api/admin/users/batch` - 批量操作用户
- `GET /api/admin/users/statistics` - 获取用户统计

## 🎨 功能特性

### ✅ 已实现功能
1. **基础架构**
   - ✅ Vue 3 + TypeScript + Vite
   - ✅ Ant Design Vue UI组件库
   - ✅ Pinia 状态管理
   - ✅ Vue Router 路由管理

2. **用户管理**
   - ✅ 用户列表展示
   - ✅ 用户搜索和筛选
   - ✅ 用户详情查看
   - ✅ 用户信息编辑
   - ✅ 用户状态管理（封禁/冻结）
   - ✅ 批量操作
   - ✅ 数据分页

3. **后端API**
   - ✅ 用户管理接口
   - ✅ 用户统计接口
   - ✅ 数据库集成

### 🚧 待开发功能
- ⏳ 内容审核模块
- ⏳ 数据统计模块
- ⏳ 举报管理模块
- ⏳ 系统设置模块
- ⏳ 管理员认证系统
- ⏳ 权限管理（RBAC）

## 🔐 测试账号

### 临时登录
当前登录页面为演示版本，任意用户名密码（密码>=6位）即可登录

### 后续需要实现
- 管理员账号系统
- JWT Token认证
- 权限验证

## 📝 开发注意事项

1. **Node.js版本**
   - 必须使用 Node.js 20+ 才能运行 Vite 7.x
   - 建议使用 nvm 管理多个Node.js版本

2. **API调用**
   - 前端默认连接 http://localhost:8889
   - 确保后端服务器已启动

3. **数据库**
   - 后端使用 Sequelize + MySQL/PostgreSQL
   - 首次运行需要同步数据库表结构

4. **跨域配置**
   - 开发环境已配置CORS
   - 生产环境需要配置Nginx反向代理

## 🐛 常见问题

### Q1: Vite启动失败
**问题**: `crypto.hash is not a function`

**解决**: 升级Node.js到20.19+或22.12+

### Q2: API请求失败
**问题**: 前端无法连接后端

**解决**:
1. 确认后端服务器已启动
2. 检查端口是否冲突
3. 查看浏览器控制台网络请求

### Q3: 数据库连接失败
**问题**: 后端启动报数据库错误

**解决**:
1. 检查数据库配置
2. 确认数据库服务已启动
3. 查看后端日志

---

**创建时间**: 2024年1月  
**最后更新**: 2024年1月

