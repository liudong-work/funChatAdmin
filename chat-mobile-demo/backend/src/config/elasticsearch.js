import { Client } from '@elastic/elasticsearch';
import { config } from './config.js';

// Elasticsearch客户端配置
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  // 开发环境配置
  requestTimeout: 30000,
  maxRetries: 3,
  resurrectStrategy: 'ping'
});

// 索引配置
export const INDEXES = {
  MESSAGES: 'chat_messages',
  USERS: 'chat_users',
  MOMENTS: 'chat_moments'
};

// 消息索引映射
export const MESSAGE_MAPPING = {
  properties: {
    message_id: { type: 'keyword' },
    uuid: { type: 'keyword' },
    conversation_id: { type: 'keyword' },
    sender_id: { type: 'keyword' },
    sender_uuid: { type: 'keyword' },
    receiver_id: { type: 'keyword' },
    receiver_uuid: { type: 'keyword' },
    content: { 
      type: 'text',
      analyzer: 'ik_max_word',  // 中文分词
      search_analyzer: 'ik_smart'
    },
    message_type: { type: 'keyword' },
    media_url: { type: 'keyword' },
    media_type: { type: 'keyword' },
    media_size: { type: 'long' },
    media_name: { type: 'keyword' },
    status: { type: 'keyword' },
    is_read: { type: 'boolean' },
    read_at: { type: 'date' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' },
    // 搜索字段
    search_content: {
      type: 'text',
      analyzer: 'ik_max_word',
      search_analyzer: 'ik_smart'
    }
  }
};

// 用户索引映射
export const USER_MAPPING = {
  properties: {
    user_id: { type: 'keyword' },
    uuid: { type: 'keyword' },
    phone: { type: 'keyword' },
    username: { 
      type: 'text',
      analyzer: 'ik_max_word'
    },
    nickname: { 
      type: 'text',
      analyzer: 'ik_max_word'
    },
    bio: { 
      type: 'text',
      analyzer: 'ik_max_word'
    },
    avatar: { type: 'keyword' },
    status: { type: 'keyword' },
    created_at: { type: 'date' },
    last_login: { type: 'date' }
  }
};

// 动态索引映射
export const MOMENT_MAPPING = {
  properties: {
    moment_id: { type: 'keyword' },
    uuid: { type: 'keyword' },
    user_id: { type: 'keyword' },
    user_uuid: { type: 'keyword' },
    content: { 
      type: 'text',
      analyzer: 'ik_max_word'
    },
    images: { type: 'keyword' },
    location: { type: 'keyword' },
    visibility: { type: 'keyword' },
    status: { type: 'keyword' },
    likes_count: { type: 'integer' },
    comments_count: { type: 'integer' },
    shares_count: { type: 'integer' },
    created_at: { type: 'date' },
    updated_at: { type: 'date' }
  }
};

// 初始化索引
export const initializeIndexes = async () => {
  try {
    console.log('🔍 初始化Elasticsearch索引...');
    
    // 检查连接
    const health = await esClient.cluster.health();
    console.log('Elasticsearch集群状态:', health.status);
    
    // 创建消息索引
    await createIndexIfNotExists(INDEXES.MESSAGES, MESSAGE_MAPPING);
    
    // 创建用户索引
    await createIndexIfNotExists(INDEXES.USERS, USER_MAPPING);
    
    // 创建动态索引
    await createIndexIfNotExists(INDEXES.MOMENTS, MOMENT_MAPPING);
    
    console.log('✅ Elasticsearch索引初始化完成');
  } catch (error) {
    console.error('❌ Elasticsearch初始化失败:', error.message);
    console.log('💡 请确保Elasticsearch服务正在运行');
  }
};

// 创建索引（如果不存在）
const createIndexIfNotExists = async (indexName, mapping) => {
  try {
    const exists = await esClient.indices.exists({ index: indexName });
    
    if (!exists) {
      await esClient.indices.create({
        index: indexName,
        body: {
          mappings: mapping,
          settings: {
            number_of_shards: 1,
            number_of_replicas: 0,
            analysis: {
              analyzer: {
                ik_max_word: {
                  type: 'custom',
                  tokenizer: 'ik_max_word'
                },
                ik_smart: {
                  type: 'custom',
                  tokenizer: 'ik_smart'
                }
              }
            }
          }
        }
      });
      console.log(`✅ 创建索引: ${indexName}`);
    } else {
      console.log(`📋 索引已存在: ${indexName}`);
    }
  } catch (error) {
    console.error(`❌ 创建索引失败 ${indexName}:`, error.message);
  }
};

// 消息操作类
export class MessageSearch {
  // 存储消息到ES
  static async saveMessage(messageData) {
    try {
      // 处理时间格式
      let created_at;
      if (messageData.created_at) {
        if (messageData.created_at instanceof Date) {
          created_at = messageData.created_at.toISOString();
        } else if (typeof messageData.created_at === 'string') {
          const date = new Date(messageData.created_at);
          if (isNaN(date.getTime())) {
            console.warn('Invalid created_at format:', messageData.created_at);
            created_at = new Date().toISOString();
          } else {
            created_at = date.toISOString();
          }
        } else {
          created_at = new Date().toISOString();
        }
      } else {
        created_at = new Date().toISOString();
      }

      const doc = {
        ...messageData,
        search_content: messageData.content, // 搜索字段
        created_at: created_at,
        updated_at: new Date().toISOString()
      };
      
      await esClient.index({
        index: INDEXES.MESSAGES,
        id: messageData.uuid,
        body: doc
      });
      
      console.log(`📝 消息已存储到ES: ${messageData.uuid}`);
      return true;
    } catch (error) {
      console.error('❌ 存储消息到ES失败:', error);
      return false;
    }
  }
  
  // 搜索消息
  static async searchMessages(query, options = {}) {
    try {
      const {
        senderId,
        receiverId,
        messageType,
        startDate,
        endDate,
        from = 0,
        size = 20
      } = options;
      
      const searchBody = {
        query: {
          bool: {
            must: []
          }
        },
        sort: [
          { created_at: { order: 'desc' } }
        ],
        from,
        size
      };
      
      // 文本搜索
      if (query) {
        searchBody.query.bool.must.push({
          multi_match: {
            query,
            fields: ['content^2', 'search_content'],
            type: 'best_fields',
            fuzziness: 'AUTO'
          }
        });
      }
      
      // 发送者过滤
      if (senderId) {
        searchBody.query.bool.must.push({
          term: { sender_id: senderId }
        });
      }
      
      // 接收者过滤
      if (receiverId) {
        searchBody.query.bool.must.push({
          term: { receiver_id: receiverId }
        });
      }
      
      // 消息类型过滤
      if (messageType) {
        searchBody.query.bool.must.push({
          term: { message_type: messageType }
        });
      }
      
      // 时间范围过滤
      if (startDate || endDate) {
        const rangeQuery = { range: { created_at: {} } };
        if (startDate) rangeQuery.range.created_at.gte = startDate;
        if (endDate) rangeQuery.range.created_at.lte = endDate;
        searchBody.query.bool.must.push(rangeQuery);
      }
      
      const response = await esClient.search({
        index: INDEXES.MESSAGES,
        body: searchBody
      });
      
      return {
        total: response.hits.total.value,
        messages: response.hits.hits.map(hit => ({
          ...hit._source,
          _score: hit._score
        }))
      };
    } catch (error) {
      console.error('❌ 搜索消息失败:', error);
      return { total: 0, messages: [] };
    }
  }
  
  // 获取对话历史
  static async getConversationHistory(userId1, userId2, options = {}) {
    try {
      const { from = 0, size = 50 } = options;
      
      const response = await esClient.search({
        index: INDEXES.MESSAGES,
        body: {
          query: {
            bool: {
              should: [
                {
                  bool: {
                    must: [
                      { term: { sender_id: userId1 } },
                      { term: { receiver_id: userId2 } }
                    ]
                  }
                },
                {
                  bool: {
                    must: [
                      { term: { sender_id: userId2 } },
                      { term: { receiver_id: userId1 } }
                    ]
                  }
                }
              ],
              minimum_should_match: 1
            }
          },
          sort: [
            { created_at: { order: 'asc' } }
          ],
          from,
          size
        }
      });
      
      return response.hits.hits.map(hit => hit._source);
    } catch (error) {
      console.error('❌ 获取对话历史失败:', error);
      return [];
    }
  }
  
  // 删除消息
  static async deleteMessage(messageId) {
    try {
      await esClient.delete({
        index: INDEXES.MESSAGES,
        id: messageId
      });
      
      console.log(`🗑️ 消息已从ES删除: ${messageId}`);
      return true;
    } catch (error) {
      console.error('❌ 删除消息失败:', error);
      return false;
    }
  }
}

export default esClient;
