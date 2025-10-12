# Elasticsearch 聊天消息存储方案

## 🎯 **方案概述**

使用Elasticsearch存储聊天消息，实现强大的搜索和分析功能：

- **文本消息** → Elasticsearch (支持全文搜索)
- **用户关系** → MySQL (结构化数据)
- **多媒体文件** → OSS/本地存储 (文件存储)

## 🛠️ **安装Elasticsearch**

### 1. **使用Docker安装 (推荐)**

```bash
# 拉取Elasticsearch镜像
docker pull elasticsearch:8.11.0

# 启动Elasticsearch容器
docker run -d \
  --name elasticsearch \
  -p 9200:9200 \
  -p 9300:9300 \
  -e "discovery.type=single-node" \
  -e "xpack.security.enabled=false" \
  -e "ES_JAVA_OPTS=-Xms512m -Xmx512m" \
  elasticsearch:8.11.0
```

### 2. **安装中文分词插件**

```bash
# 进入容器
docker exec -it elasticsearch bash

# 安装IK分词插件
bin/elasticsearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v8.11.0/elasticsearch-analysis-ik-8.11.0.zip

# 重启容器
docker restart elasticsearch
```

### 3. **验证安装**

```bash
# 检查集群状态
curl http://localhost:9200/_cluster/health

# 检查插件
curl http://localhost:9200/_cat/plugins
```

## 📊 **索引结构**

### **消息索引 (chat_messages)**

```json
{
  "message_id": "123",
  "uuid": "msg_uuid_123",
  "conversation_id": "user1_user2",
  "sender_id": "8",
  "sender_uuid": "user_1760235729119_r0v7nivqw",
  "receiver_id": "9", 
  "receiver_uuid": "user_1760235816214_wzlf0j2vp",
  "content": "你好，这是一条消息",
  "message_type": "text",
  "media_url": null,
  "media_type": null,
  "media_size": null,
  "media_name": null,
  "status": "sent",
  "is_read": false,
  "read_at": null,
  "created_at": "2025-01-12T15:30:00.000Z",
  "updated_at": "2025-01-12T15:30:00.000Z"
}
```

## 🔍 **搜索功能**

### **1. 全文搜索**
```bash
# 搜索包含"你好"的消息
GET /chat_messages/_search
{
  "query": {
    "multi_match": {
      "query": "你好",
      "fields": ["content^2", "search_content"],
      "type": "best_fields",
      "fuzziness": "AUTO"
    }
  }
}
```

### **2. 对话历史查询**
```bash
# 查询两个用户之间的对话
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
      ],
      "minimum_should_match": 1
    }
  },
  "sort": [{"created_at": {"order": "asc"}}]
}
```

### **3. 时间范围查询**
```bash
# 查询指定时间范围内的消息
GET /chat_messages/_search
{
  "query": {
    "range": {
      "created_at": {
        "gte": "2025-01-01",
        "lte": "2025-01-31"
      }
    }
  }
}
```

## 🚀 **API接口**

### **1. 消息搜索**
```
GET /api/message/search?q=搜索关键词&sender_id=8&from=0&size=20
```

**参数：**
- `q`: 搜索关键词
- `sender_id`: 发送者ID
- `receiver_id`: 接收者ID
- `message_type`: 消息类型
- `start_date`: 开始时间
- `end_date`: 结束时间
- `from`: 分页起始位置
- `size`: 每页数量

### **2. 对话历史**
```
GET /api/message/history/user_1760235729119_r0v7nivqw/user_1760235816214_wzlf0j2vp?from=0&size=50
```

## 📈 **性能优化**

### **1. 索引优化**
```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "refresh_interval": "30s"
  }
}
```

### **2. 查询优化**
- 使用过滤器而非查询进行精确匹配
- 合理使用分页避免深度分页
- 缓存常用查询结果

### **3. 数据同步**
- 异步写入Elasticsearch
- 失败重试机制
- 数据一致性检查

## 🔧 **环境配置**

### **环境变量**
```bash
# Elasticsearch配置
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USERNAME=
ELASTICSEARCH_PASSWORD=
```

### **生产环境建议**
- 使用Elasticsearch集群
- 配置索引生命周期管理
- 设置适当的备份策略
- 监控集群健康状态

## 🎯 **使用场景**

1. **消息搜索** - 快速查找历史消息
2. **对话分析** - 分析用户聊天模式
3. **内容审核** - 检测敏感词汇
4. **数据统计** - 消息量、活跃度统计
5. **智能推荐** - 基于消息内容的推荐

## 📚 **相关文档**

- [Elasticsearch官方文档](https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html)
- [IK分词插件](https://github.com/medcl/elasticsearch-analysis-ik)
- [Elasticsearch性能调优](https://www.elastic.co/guide/en/elasticsearch/performance.html)
