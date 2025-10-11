#!/bin/bash

# 启动数据库版本服务器脚本

echo "🚀 启动数据库版本服务器..."
echo ""

# 检查MySQL是否运行
if ! pgrep -x "mysqld" > /dev/null; then
    echo "⚠️  MySQL服务器未运行，请先启动MySQL"
    exit 1
fi

# 检查.env文件是否存在
if [ ! -f ".env" ]; then
    echo "⚠️  .env文件不存在，正在从模板创建..."
    cp env-template.txt .env
    echo "✅ .env文件已创建，请配置数据库密码"
    exit 1
fi

# 停止旧的服务器
echo "🛑 停止旧服务器..."
pkill -f "node src/server" > /dev/null 2>&1

# 启动新服务器
echo "🚀 启动服务器..."
node src/server-with-db.js


