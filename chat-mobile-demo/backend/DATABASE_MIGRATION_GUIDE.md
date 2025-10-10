# 📚 数据库迁移指南

## 📋 概述

本项目已从**内存存储**迁移到**MySQL数据库**，实现数据持久化存储。

## 🗄️ 数据库信息

- **数据库类型**: MySQL 8.0+
- **ORM框架**: Sequelize
- **数据库名**: drift_bottle
- **字符集**: utf8mb4

## 🚀 快速开始

### 1. 安装MySQL

#### macOS (使用Homebrew)
```bash
brew install mysql
brew services start mysql
```

#### 使用Docker
```bash
docker run --name mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -p 3306:3306 \
  -d mysql:8.0
```

### 2. 创建数据库

```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/init-database.sql
```

或直接执行：
```bash
mysql -u root -p < backend/init-database.sql
```

### 3. 配置环境变量

编辑 `backend/.env` 文件，设置数据库连接信息：

```env
# MySQL 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=drift_bottle
DB_USER=root
DB_PASSWORD=your_password_here  # 设置你的MySQL密码
```

### 4. 启动服务器

```bash
cd backend
node src/server-simple.js
```

服务器会自动：
1. 连接数据库
2. 同步数据模型
3. 创建/更新表结构

## 📊 数据库表结构

### 核心表

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `users` | 用户表 | uuid, phone, username, status |
| `bottles` | 漂流瓶表 | uuid, content, sender_uuid, receiver_uuid, status |
| `conversations` | 对话表 | uuid, user1_uuid, user2_uuid |
| `messages` | 消息表 | uuid, conversation_uuid, sender_uuid, content, type |
| `moments` | 动态表 | uuid, user_uuid, content, images, status |
| `admins` | 管理员表 | id, username, password, role |
| `verification_codes` | 验证码表 | phone, code, type, expires_at |

### 表关系

```
users (1) ----< (N) bottles (sender_uuid)
users (1) ----< (N) moments (user_uuid)
users (1) ----< (N) messages (sender_uuid)
conversations (1) ----< (N) messages (conversation_uuid)
bottles (1) ----< (N) messages (bottle_uuid)
```

## 🔄 数据迁移状态

### ✅ 已完成
- [x] 安装MySQL依赖包 (mysql2, sequelize)
- [x] 创建数据库配置文件
- [x] 设计数据库表结构
- [x] 创建Sequelize数据模型
- [x] 定义模型关联关系

### 🔄 进行中
- [ ] 迁移漂流瓶API到数据库存储
- [ ] 迁移用户API到数据库存储
- [ ] 迁移消息API到数据库存储
- [ ] 迁移动态API到数据库存储

### ⏳ 待完成
- [ ] 测试数据库功能
- [ ] 验证数据持久化
- [ ] 性能优化
- [ ] 数据备份方案

## 📝 使用说明

### 查询示例

```javascript
// 导入模型
import { User, Bottle, Message, Moment } from './models/index.js';

// 创建用户
const user = await User.create({
  phone: '13800138000',
  username: '测试用户'
});

// 查询用户
const users = await User.findAll({
  where: { status: 'active' },
  limit: 10
});

// 创建漂流瓶
const bottle = await Bottle.create({
  sender_uuid: user.uuid,
  content: '这是一个漂流瓶',
  mood: 'happy',
  status: 'sea'
});

// 查询漂流瓶（包含发送者信息）
const bottles = await Bottle.findAll({
  where: { status: 'sea' },
  include: [{ model: User, as: 'sender' }],
  limit: 10
});
```

### 事务示例

```javascript
import sequelize from './config/database.js';

const t = await sequelize.transaction();

try {
  // 在事务中执行多个操作
  const user = await User.create({ phone: '13800138000' }, { transaction: t });
  const bottle = await Bottle.create({ sender_uuid: user.uuid, content: 'Hello' }, { transaction: t });
  
  // 提交事务
  await t.commit();
} catch (error) {
  // 回滚事务
  await t.rollback();
  throw error;
}
```

## ⚠️ 注意事项

1. **首次运行**：
   - 确保MySQL服务已启动
   - 确保数据库 `drift_bottle` 已创建
   - 确保`.env`文件中的数据库密码正确

2. **数据迁移**：
   - 旧的内存数据不会自动迁移
   - 首次启动后，所有数据表将为空
   - 用户需要重新注册

3. **性能优化**：
   - 已添加必要的索引
   - 使用连接池管理数据库连接
   - 建议定期清理过期数据

4. **备份建议**：
   - 定期备份数据库
   - 建议使用MySQL的自动备份功能
   - 保留至少7天的备份

## 🔧 故障排除

### 连接失败
```
❌ 数据库连接失败: Error: connect ECONNREFUSED 127.0.0.1:3306
```

**解决方案**：
1. 检查MySQL是否运行：`brew services list` 或 `docker ps`
2. 检查端口是否正确：默认3306
3. 检查密码是否正确

### 表不存在
```
❌ Table 'drift_bottle.users' doesn't exist
```

**解决方案**：
1. 执行初始化脚本：`mysql -u root -p < backend/init-database.sql`
2. 或让Sequelize自动创建：`sequelize.sync({ force: true })`（注意：这会删除所有数据）

### 权限问题
```
❌ Access denied for user 'root'@'localhost'
```

**解决方案**：
1. 检查用户名和密码
2. 授予权限：`GRANT ALL PRIVILEGES ON drift_bottle.* TO 'root'@'localhost';`

## 📚 相关文档

- [Sequelize官方文档](https://sequelize.org/)
- [MySQL官方文档](https://dev.mysql.com/doc/)
- [项目API文档](./API_DOCUMENTATION.md)

## 🆘 获取帮助

如遇到问题，请：
1. 检查本文档的故障排除部分
2. 查看服务器日志：`backend/logs/drift-bottle.log`
3. 查看MySQL日志

---

最后更新：2025-10-10

