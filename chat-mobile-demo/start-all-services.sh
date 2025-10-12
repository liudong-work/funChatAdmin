#!/bin/bash

# 聊天应用完整服务启动脚本
# 包含: Elasticsearch, Kibana, MySQL, 后端服务, 前端应用, 管理后台

echo "======================================"
echo "🚀 启动聊天应用所有服务"
echo "======================================"

# 切换到项目根目录
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. 检查MySQL
echo -e "\n${YELLOW}[1/6] 检查MySQL服务...${NC}"
if pgrep -x "mysqld" > /dev/null; then
    echo -e "${GREEN}✅ MySQL已运行${NC}"
else
    echo -e "${RED}❌ MySQL未运行，请先启动MySQL${NC}"
    exit 1
fi

# 2. 启动Elasticsearch
echo -e "\n${YELLOW}[2/6] 启动Elasticsearch...${NC}"
if pgrep -f "elasticsearch" > /dev/null; then
    echo -e "${GREEN}✅ Elasticsearch已运行${NC}"
else
    cd "$PROJECT_ROOT/backend/elasticsearch-8.11.0"
    ./bin/elasticsearch -d
    echo -e "${GREEN}✅ Elasticsearch启动中...${NC}"
    sleep 10
fi

# 3. 启动Kibana
echo -e "\n${YELLOW}[3/6] 启动Kibana...${NC}"
if pgrep -f "kibana" > /dev/null; then
    echo -e "${GREEN}✅ Kibana已运行${NC}"
else
    cd "$PROJECT_ROOT/backend/kibana-8.11.0"
    nohup ./bin/kibana > kibana.log 2>&1 &
    echo -e "${GREEN}✅ Kibana启动中...${NC}"
fi

# 4. 启动后端服务
echo -e "\n${YELLOW}[4/6] 启动后端服务...${NC}"
if pgrep -f "server-with-db.js" > /dev/null; then
    echo -e "${GREEN}✅ 后端服务已运行${NC}"
else
    cd "$PROJECT_ROOT/backend"
    nohup node src/server-with-db.js > server.log 2>&1 &
    echo -e "${GREEN}✅ 后端服务启动中...${NC}"
    sleep 5
fi

# 5. 启动前端应用
echo -e "\n${YELLOW}[5/6] 启动前端应用...${NC}"
if pgrep -f "expo start" > /dev/null; then
    echo -e "${GREEN}✅ 前端应用已运行${NC}"
else
    cd "$PROJECT_ROOT"
    nohup npx expo start --port 8081 --clear > expo.log 2>&1 &
    echo -e "${GREEN}✅ 前端应用启动中...${NC}"
fi

# 6. 启动管理后台
echo -e "\n${YELLOW}[6/6] 启动管理后台...${NC}"
ADMIN_PATH="$HOME/Desktop/myGitProgect/chat-admin-system/frontend"
if [ -d "$ADMIN_PATH" ]; then
    if pgrep -f "vite" > /dev/null; then
        echo -e "${GREEN}✅ 管理后台已运行${NC}"
    else
        cd "$ADMIN_PATH"
        nohup npm run dev > admin.log 2>&1 &
        echo -e "${GREEN}✅ 管理后台启动中...${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  管理后台目录不存在，跳过${NC}"
fi

# 等待服务完全启动
echo -e "\n${YELLOW}⏳ 等待所有服务完全启动...${NC}"
sleep 10

# 显示服务状态
echo -e "\n======================================"
echo -e "${GREEN}📊 服务状态总览${NC}"
echo "======================================"

# 检查各服务状态
check_service() {
    local url=$1
    local name=$2
    if curl -s "$url" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ $name: $url${NC}"
    else
        echo -e "${RED}❌ $name: 无法访问${NC}"
    fi
}

check_service "http://localhost:3306" "MySQL         "
check_service "http://localhost:9200" "Elasticsearch "
check_service "http://localhost:5601" "Kibana        "
check_service "http://localhost:8889/health" "后端服务      "
check_service "http://localhost:8081" "前端应用      "
check_service "http://localhost:5173" "管理后台      "

echo ""
echo "======================================"
echo -e "${GREEN}🎉 所有服务启动完成！${NC}"
echo "======================================"
echo ""
echo "📱 前端应用: http://localhost:8081"
echo "🔧 后端服务: http://localhost:8889"
echo "🎨 Kibana: http://localhost:5601"
echo "🔍 Elasticsearch: http://localhost:9200"
echo "⚙️  管理后台: http://localhost:5173"
echo ""
echo "======================================"
