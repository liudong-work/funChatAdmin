#!/bin/bash

echo "=== Expo 开发服务器日志查看器 ==="
echo "按 Ctrl+C 退出"
echo ""

# 检查 Expo 服务是否运行
if pgrep -f "expo start" > /dev/null; then
    echo "✅ Expo 服务正在运行"
    echo "📱 请在手机上打开 Expo Go 并连接到项目"
    echo "🔍 日志将显示在下方："
    echo ""
    
    # 尝试查看 Expo 进程的日志
    EXPO_PID=$(pgrep -f "expo start" | head -1)
    if [ ! -z "$EXPO_PID" ]; then
        echo "Expo 进程 ID: $EXPO_PID"
        echo "正在监控日志..."
        echo ""
        
        # 使用 lsof 查看进程的文件描述符
        lsof -p $EXPO_PID 2>/dev/null | grep -E "(stdout|stderr)" || echo "无法直接查看进程输出"
    fi
else
    echo "❌ Expo 服务未运行"
    echo "请先启动 Expo 服务："
    echo "cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo"
    echo "npx expo start --tunnel --port 8083"
fi

echo ""
echo "💡 提示："
echo "1. 在 Expo Go 中摇动设备打开调试菜单"
echo "2. 选择 'Debug Remote JS' 查看 JavaScript 日志"
echo "3. 在浏览器中打开 http://localhost:8083 查看开发工具"
echo "4. 使用 Chrome DevTools 查看网络请求和日志"
