#!/bin/bash

# 聊天应用完整服务停止脚本

echo "======================================"
echo "🛑 停止聊天应用所有服务"
echo "======================================"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 停止Kibana
echo -e "\n${YELLOW}[1/5] 停止Kibana...${NC}"
if pkill -f "kibana"; then
    echo -e "${GREEN}✅ Kibana已停止${NC}"
else
    echo -e "${YELLOW}⚠️  Kibana未运行${NC}"
fi

# 停止Elasticsearch
echo -e "\n${YELLOW}[2/5] 停止Elasticsearch...${NC}"
if pkill -f "elasticsearch"; then
    echo -e "${GREEN}✅ Elasticsearch已停止${NC}"
else
    echo -e "${YELLOW}⚠️  Elasticsearch未运行${NC}"
fi

# 停止后端服务
echo -e "\n${YELLOW}[3/5] 停止后端服务...${NC}"
if pkill -f "server-with-db.js"; then
    echo -e "${GREEN}✅ 后端服务已停止${NC}"
else
    echo -e "${YELLOW}⚠️  后端服务未运行${NC}"
fi

# 停止前端应用
echo -e "\n${YELLOW}[4/5] 停止前端应用...${NC}"
if pkill -f "expo start"; then
    echo -e "${GREEN}✅ 前端应用已停止${NC}"
else
    echo -e "${YELLOW}⚠️  前端应用未运行${NC}"
fi

# 停止管理后台
echo -e "\n${YELLOW}[5/5] 停止管理后台...${NC}"
if pkill -f "vite"; then
    echo -e "${GREEN}✅ 管理后台已停止${NC}"
else
    echo -e "${YELLOW}⚠️  管理后台未运行${NC}"
fi

echo ""
echo "======================================"
echo -e "${GREEN}✅ 所有服务已停止${NC}"
echo "======================================"
