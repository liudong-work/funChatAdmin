# 📚 MySQL 安装和配置指南

## 🎯 目标

在你的Mac上安装MySQL并配置漂流瓶项目数据库。

## 📋 方案选择

### 方案 1: 使用 Homebrew 安装（推荐）

#### 步骤 1: 安装 Homebrew（如果还没有）
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### 步骤 2: 安装 MySQL
```bash
brew install mysql
```

#### 步骤 3: 启动 MySQL 服务
```bash
brew services start mysql
```

#### 步骤 4: 安全配置（可选但推荐）
```bash
mysql_secure_installation
```

按照提示操作：
- 设置root密码（记住这个密码！）
- 移除匿名用户：Y
- 禁止root远程登录：Y
- 移除测试数据库：Y
- 重新加载权限表：Y

#### 步骤 5: 创建数据库
```bash
# 登录MySQL
mysql -u root -p
# 输入你刚才设置的密码

# 或者直接执行初始化脚本
mysql -u root -p < /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/init-database.sql
```

#### 步骤 6: 配置项目
编辑 `backend/.env` 文件，设置你的MySQL密码：
```env
DB_PASSWORD=你的MySQL密码
```

### 方案 2: 使用 Docker（快速方案）

#### 步骤 1: 安装 Docker Desktop
从官网下载：https://www.docker.com/products/docker-desktop

#### 步骤 2: 启动 MySQL 容器
```bash
docker run --name drift-bottle-mysql \
  -e MYSQL_ROOT_PASSWORD=password123 \
  -e MYSQL_DATABASE=drift_bottle \
  -p 3306:3306 \
  -d mysql:8.0 \
  --character-set-server=utf8mb4 \
  --collation-server=utf8mb4_unicode_ci
```

#### 步骤 3: 等待MySQL启动（约30秒）
```bash
docker logs drift-bottle-mysql
# 看到 "ready for connections" 说明启动成功
```

#### 步骤 4: 执行初始化脚本
```bash
docker exec -i drift-bottle-mysql mysql -uroot -ppassword123 < /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/init-database.sql
```

#### 步骤 5: 配置项目
编辑 `backend/.env` 文件：
```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=drift_bottle
DB_USER=root
DB_PASSWORD=password123
```

## ✅ 验证安装

### 测试数据库连接
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend
node test-db-connection.js
```

如果看到 "🎉 所有测试通过！" 说明配置成功！

### 手动测试
```bash
mysql -u root -p
# 输入密码后

USE drift_bottle;
SHOW TABLES;
```

应该看到以下表：
- admins
- bottles
- conversations
- messages
- moments
- users
- verification_codes

## 🔧 常见问题

### 问题 1: MySQL 无法启动

**Homebrew 方案**:
```bash
# 检查状态
brew services list

# 重启MySQL
brew services restart mysql

# 查看日志
tail -f /usr/local/var/mysql/*.err
```

**Docker 方案**:
```bash
# 查看容器状态
docker ps -a

# 查看日志
docker logs drift-bottle-mysql

# 重启容器
docker restart drift-bottle-mysql
```

### 问题 2: 连接被拒绝

检查：
1. MySQL服务是否运行
2. 端口3306是否被占用：`lsof -i :3306`
3. 密码是否正确

### 问题 3: 权限错误

```sql
-- 登录MySQL
mysql -u root -p

-- 授予权限
GRANT ALL PRIVILEGES ON drift_bottle.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### 问题 4: 字符集问题

确保MySQL配置使用utf8mb4：
```sql
SHOW VARIABLES LIKE 'character%';
SHOW VARIABLES LIKE 'collation%';
```

## 🚀 下一步

安装完成后：

1. **测试数据库连接**:
   ```bash
   cd backend
   node test-db-connection.js
   ```

2. **启动服务器**（待迁移完成后）:
   ```bash
   node src/server-with-db.js
   ```

3. **查看数据库管理工具**:
   - MySQL Workbench: https://www.mysql.com/products/workbench/
   - DBeaver: https://dbeaver.io/
   - Sequel Pro (Mac): https://www.sequelpro.com/

## 📊 Docker管理命令

如果使用Docker方案，这些命令很有用：

```bash
# 启动容器
docker start drift-bottle-mysql

# 停止容器
docker stop drift-bottle-mysql

# 查看日志
docker logs -f drift-bottle-mysql

# 进入MySQL命令行
docker exec -it drift-bottle-mysql mysql -uroot -ppassword123

# 备份数据库
docker exec drift-bottle-mysql mysqldump -uroot -ppassword123 drift_bottle > backup.sql

# 恢复数据库
docker exec -i drift-bottle-mysql mysql -uroot -ppassword123 drift_bottle < backup.sql

# 删除容器（慎用！会删除所有数据）
docker rm -f drift-bottle-mysql
```

## 💡 推荐配置

### 开发环境
- 使用 **Docker** 方案：快速、隔离、容易重置

### 生产环境
- 使用 **Homebrew** 或独立安装：性能更好、更稳定
- 配置自动备份
- 启用慢查询日志
- 优化MySQL参数

## 📞 获取帮助

如果遇到问题：
1. 查看本文档的"常见问题"部分
2. 查看服务器日志：`backend/logs/drift-bottle.log`
3. 查看MySQL错误日志

---

**快速开始命令（Docker方案）**:
```bash
# 1. 启动MySQL
docker run --name drift-bottle-mysql -e MYSQL_ROOT_PASSWORD=password123 -e MYSQL_DATABASE=drift_bottle -p 3306:3306 -d mysql:8.0

# 2. 等待30秒

# 3. 初始化数据库
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend
docker exec -i drift-bottle-mysql mysql -uroot -ppassword123 < init-database.sql

# 4. 配置密码（编辑.env，设置 DB_PASSWORD=password123）

# 5. 测试连接
node test-db-connection.js

# 6. 完成！
```

