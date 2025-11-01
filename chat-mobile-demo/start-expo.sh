#!/bin/bash

# Expo 前端启动脚本
# 使用此脚本可以看到 Expo QR 码并进行交互

cd "$(dirname "$0")"

echo "======================================"
echo "🚀 启动 Expo 开发服务器"
echo "======================================"
echo ""

# 加载 nvm 环境
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# 确保使用正确的 Node 版本
export PATH="$HOME/.nvm/versions/node/v18.20.8/bin:$PATH"

echo "📱 启动中..."
echo ""

# 启动 Expo
npx expo start --port 8081

echo ""
echo "======================================"

