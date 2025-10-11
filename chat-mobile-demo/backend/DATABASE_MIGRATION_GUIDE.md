# 数据库迁移指南

## 📋 概述

项目已成功从内存存储迁移到MySQL数据库。本指南将帮助你了解新的数据库架构和使用方法。

## 🗄️ 数据库架构

### 已创建的表

| 表名 | 说明 | 主要字段 |
|------|------|---------|
| `users` | 用户表 | id, uuid, phone, nickname, avatar, bio, status |
| `moments` | 动态表 | id, uuid, user_id, content, images, likes_count, comments_count |
| `comments` | 评论表 | id, uuid, moment_id, user_id, content, reply_to_id |
| `likes` | 点赞表 | id, user_id, target_type, target_id |
| `follows` | 关注表 | id, follower_id, following_id, status |
| `messages` | 消息表 | id, uuid, sender_id, receiver_id, content, is_read |
| `bottles` | 漂流瓶表 | id, uuid, sender_uuid, receiver_uuid, content, status |

### 模型关联

- **User ↔ Moment**: 一对多（一个用户可以发布多条动态）
- **User ↔ Comment**: 一对多（一个用户可以发布多条评论）
- **Moment ↔ Comment**: 一对多（一条动态可以有多条评论）
- **User ↔ User (Follow)**: 多对多（用户之间的关注关系）
- **User ↔ Message**: 一对多（用户之间的消息）

## 🚀 启动服务器

### 使用新的数据库服务器

```bash
cd backend
node src/server-with-db.js
```

### 使用旧的内存服务器（兼容）

```bash
cd backend
node src/server-simple.js
```

## 🔧 配置

### 环境变量 (.env)

```env
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=drift_bottle
DB_USER=root
DB_PASSWORD=12345678

# 应用配置
NODE_ENV=development
PORT=8889
HOST=0.0.0.0

# JWT配置
JWT_SECRET=drift_bottle_jwt_secret_key_2024
JWT_EXPIRES_IN=7d
```

## 📦 数据库初始化

### 首次设置

1. 确保MySQL服务器正在运行
2. 创建数据库（如果尚未创建）:
   ```bash
   mysql -u root -p -e "CREATE DATABASE drift_bottle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   ```

3. 运行数据库初始化脚本:
   ```bash
   node init-database.js
   ```

### 重置数据库

如果需要重置数据库：

```bash
# 删除并重新创建数据库
mysql -u root -p12345678 -e "DROP DATABASE drift_bottle; CREATE DATABASE drift_bottle CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 重新初始化
node init-database.js
```

## 🔄 API变化

### 新增的数据库API

所有API都已迁移到使用数据库，主要包括：

#### 用户认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/user/profile` - 获取用户信息
- `PUT /api/user/profile` - 更新用户信息

#### 关注功能
- `POST /api/follow/:target_uuid` - 关注/取消关注
- `GET /api/follow/following/:user_uuid?` - 获取关注列表
- `GET /api/follow/followers/:user_uuid?` - 获取粉丝列表
- `GET /api/follow/status/:target_uuid` - 检查关注状态

#### 动态功能
- `POST /api/moments/publish` - 发布动态
- `GET /api/moments/list` - 获取动态列表
- `GET /api/moments/:moment_uuid` - 获取动态详情
- `POST /api/moments/:moment_uuid/like` - 点赞/取消点赞
- `POST /api/moments/:moment_uuid/comment` - 评论动态
- `GET /api/moments/user/:user_uuid` - 获取用户动态列表

#### WebSocket消息
- 所有WebSocket消息都会自动保存到数据库
- 消息状态会实时更新（sent → delivered → read）

## 🎯 主要改进

### 1. **数据持久化**
- 所有数据现在都存储在MySQL数据库中
- 服务器重启后数据不会丢失

### 2. **性能优化**
- 使用数据库索引提高查询性能
- 支持分页查询，避免一次性加载大量数据

### 3. **数据一致性**
- 使用外键约束保证数据完整性
- 支持事务处理

### 4. **可扩展性**
- 易于添加新的字段和表
- 支持复杂的查询和关联

## 🔍 查询数据

### 使用MySQL客户端

```bash
# 连接数据库
mysql -u root -p12345678 drift_bottle

# 查询用户
SELECT * FROM users;

# 查询动态
SELECT m.*, u.nickname as author_name 
FROM moments m 
JOIN users u ON m.user_id = u.id 
ORDER BY m.created_at DESC 
LIMIT 10;

# 查询关注关系
SELECT 
  u1.nickname as follower,
  u2.nickname as following
FROM follows f
JOIN users u1 ON f.follower_id = u1.id
JOIN users u2 ON f.following_id = u2.id
WHERE f.status = 'active';
```

## 📝 注意事项

1. **数据迁移**: 旧的内存数据不会自动迁移到数据库，需要用户重新注册和创建数据
2. **密码管理**: 确保 `.env` 文件的安全，不要提交到Git仓库
3. **备份**: 定期备份数据库
4. **索引**: 根据实际查询需求可能需要添加更多索引

## 🐛 故障排查

### 数据库连接失败

```bash
# 检查MySQL服务状态
ps aux | grep mysql

# 测试数据库连接
mysql -u root -p12345678 -e "SELECT 1;"
```

### 表不存在

```bash
# 重新运行初始化脚本
node init-database.js
```

### 性能问题

```bash
# 查看慢查询
mysql -u root -p12345678 -e "SHOW PROCESSLIST;"

# 分析表
mysql -u root -p12345678 drift_bottle -e "ANALYZE TABLE users, moments, comments, follows;"
```

## 📚 相关文件

- `src/server-with-db.js` - 新的数据库服务器
- `src/server-simple.js` - 旧的内存服务器（兼容）
- `src/models/index.js` - 数据库模型定义
- `src/routes/moment-db.js` - 动态路由（数据库版本）
- `init-database.js` - 数据库初始化脚本
- `.env` - 环境变量配置

## 🎉 总结

数据库迁移已完成！现在你可以：
- ✅ 使用MySQL存储所有数据
- ✅ 数据持久化，服务器重启不丢失
- ✅ 更好的性能和可扩展性
- ✅ 支持复杂的查询和关联

如有问题，请查看日志文件：`logs/drift-bottle.log`
