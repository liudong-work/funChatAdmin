# 🎨 Kibana可视化使用指南

## 📋 **访问信息**

### **Kibana控制台**
- **访问地址**: http://localhost:5601
- **状态**: ✅ 已启动
- **连接到**: Elasticsearch (http://localhost:9200)

## 🚀 **快速开始**

### 1. **打开浏览器访问**
```
http://localhost:5601
```

### 2. **首次使用设置**

#### **跳过欢迎界面**
首次访问时会看到欢迎界面，可以：
- 点击 "Explore on my own" 跳过引导
- 或者跟随向导进行配置

#### **创建索引模式 (Index Pattern)**

1. 点击左侧菜单 ☰ → **Management** → **Stack Management**
2. 在左侧菜单中选择 **Index Patterns**
3. 点击 **Create index pattern**
4. 输入索引模式名称：`chat_messages*`
5. 选择时间字段：`created_at`
6. 点击 **Create index pattern**

## 📊 **功能使用**

### **1. Discover - 数据探索**

#### **查看消息数据**
1. 点击左侧菜单 ☰ → **Discover**
2. 选择索引模式：`chat_messages*`
3. 设置时间范围（右上角）
4. 查看消息列表和详情

#### **搜索消息**
在搜索框中输入：
```
content: "测试"
```

#### **高级搜索**
```
# 搜索特定发送者的消息
sender_uuid: "user_1760235816214_wzlf0j2vp"

# 搜索特定时间范围
created_at: [2025-01-01 TO 2025-12-31]

# 组合搜索
content: "你好" AND sender_id: "8"
```

### **2. Dashboard - 数据可视化**

#### **创建仪表板**
1. 点击左侧菜单 ☰ → **Dashboard**
2. 点击 **Create dashboard**
3. 点击 **Add** 添加可视化图表

#### **推荐的可视化图表**

##### **消息量统计**
- **类型**: Line Chart / Bar Chart
- **指标**: Count
- **时间字段**: created_at
- **用途**: 查看消息发送趋势

##### **用户活跃度**
- **类型**: Pie Chart
- **聚合**: Terms
- **字段**: sender_uuid
- **用途**: 查看哪些用户最活跃

##### **对话分布**
- **类型**: Heat Map
- **X轴**: sender_uuid
- **Y轴**: receiver_uuid
- **用途**: 查看用户之间的对话关系

##### **消息类型分布**
- **类型**: Pie Chart
- **字段**: message_type
- **用途**: 查看文本、图片等消息类型比例

### **3. Dev Tools - 开发工具**

#### **直接查询Elasticsearch**
1. 点击左侧菜单 ☰ → **Dev Tools**
2. 在Console中输入查询：

```json
# 查询所有消息
GET /chat_messages/_search
{
  "query": {
    "match_all": {}
  },
  "size": 10
}

# 搜索特定内容
GET /chat_messages/_search
{
  "query": {
    "match": {
      "content": "测试"
    }
  }
}

# 获取特定对话
GET /chat_messages/_search
{
  "query": {
    "bool": {
      "should": [
        {
          "bool": {
            "must": [
              {"term": {"sender_id": "8"}},
              {"term": {"receiver_id": "9"}}
            ]
          }
        },
        {
          "bool": {
            "must": [
              {"term": {"sender_id": "9"}},
              {"term": {"receiver_id": "8"}}
            ]
          }
        }
      ]
    }
  },
  "sort": [{"created_at": "asc"}]
}

# 统计消息数量
GET /chat_messages/_count

# 查看索引映射
GET /chat_messages/_mapping

# 查看索引设置
GET /chat_messages/_settings
```

## 📈 **推荐的监控面板**

### **实时消息监控**
```
- 消息总数
- 今日消息数
- 活跃用户数
- 平均消息长度
- 消息类型分布
```

### **用户行为分析**
```
- 最活跃用户Top 10
- 用户消息发送时间分布
- 用户对话网络图
- 新增用户趋势
```

### **系统性能监控**
```
- 消息发送速率
- 响应时间分布
- 错误率统计
- 存储空间使用
```

## 🎯 **常用查询示例**

### **按时间范围查询**
```json
GET /chat_messages/_search
{
  "query": {
    "range": {
      "created_at": {
        "gte": "2025-01-01",
        "lte": "2025-12-31"
      }
    }
  }
}
```

### **模糊搜索**
```json
GET /chat_messages/_search
{
  "query": {
    "fuzzy": {
      "content": {
        "value": "你好",
        "fuzziness": "AUTO"
      }
    }
  }
}
```

### **聚合统计**
```json
GET /chat_messages/_search
{
  "size": 0,
  "aggs": {
    "messages_per_user": {
      "terms": {
        "field": "sender_uuid",
        "size": 10
      }
    },
    "messages_over_time": {
      "date_histogram": {
        "field": "created_at",
        "calendar_interval": "day"
      }
    }
  }
}
```

## 🔧 **服务管理**

### **启动Kibana**
```bash
cd /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/kibana-8.11.0
nohup ./bin/kibana > kibana.log 2>&1 &
```

### **停止Kibana**
```bash
pkill -f kibana
```

### **查看日志**
```bash
tail -f /Users/liudong/Desktop/myGitProgect/appdemo/chat-mobile-demo/backend/kibana-8.11.0/kibana.log
```

### **检查状态**
```bash
curl http://localhost:5601/api/status
```

## 💡 **技巧和最佳实践**

### **性能优化**
1. **使用时间范围过滤** - 限制查询的时间范围可以提高性能
2. **合理使用聚合** - 聚合查询比普通查询更消耗资源
3. **保存常用查询** - 可以保存为Saved Search便于重用

### **数据分析**
1. **使用过滤器** - 组合多个过滤条件进行精准分析
2. **导出数据** - 可以导出CSV格式的数据进行深入分析
3. **创建告警** - 设置阈值告警监控异常情况

### **可视化技巧**
1. **使用合适的图表类型** - 不同数据适合不同的可视化方式
2. **添加交互功能** - 使用drill-down功能深入查看数据
3. **定期刷新** - 设置自动刷新间隔实时监控数据

## 🔗 **相关链接**

- **Elasticsearch**: http://localhost:9200
- **Kibana**: http://localhost:5601
- **后端服务**: http://localhost:8889
- **前端应用**: http://localhost:8081

## 📚 **参考文档**

- [Kibana官方文档](https://www.elastic.co/guide/en/kibana/current/index.html)
- [Elasticsearch查询DSL](https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl.html)
- [Kibana可视化指南](https://www.elastic.co/guide/en/kibana/current/dashboard.html)

## 🎉 **开始使用**

现在就打开浏览器访问 http://localhost:5601 开始探索你的聊天数据吧！
