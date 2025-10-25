import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput, Image, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageApi } from "./services/apiService";

export default function MessagesScreen({ navigation, onNewMessageCallback }) {
  const [searchText, setSearchText] = useState('');
  
  const [users, setUsers] = useState([]);
  const [currentUserUuid, setCurrentUserUuid] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  
  // 加载用户信息
  useEffect(() => {
    loadUserInfo();
  }, []);

  // 每次进入消息页面时都重新加载消息列表
  useFocusEffect(
    useCallback(() => {
      console.log('消息页面获得焦点，重新加载消息列表');
      loadConversations();
    }, [])
  );

  // Register callback function when component mounts
  useEffect(() => {
    if (onNewMessageCallback) {
      console.log('[Messages] 注册新消息回调');
      onNewMessageCallback(addUserToMessages);
    }
  }, [onNewMessageCallback, addUserToMessages]);

  const loadUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const user = JSON.parse(userInfo);
        setCurrentUserUuid(user.uuid);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  // 下拉刷新处理
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  // 加载消息列表
  const loadConversations = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      console.log('[MESSAGES] 调试信息:', {
        hasToken: !!token,
        hasUserInfo: !!userInfo,
        userInfoContent: userInfo
      });
      
      if (!token || !userInfo) {
        console.warn('未找到认证信息，无法加载消息列表');
        return;
      }

      const user = JSON.parse(userInfo);
      console.log('[MESSAGES] 解析后的用户信息:', user);
      console.log('[MESSAGES] 用户UUID:', user.uuid);
      
      if (!user.uuid) {
        console.error('[MESSAGES] 用户信息缺少UUID字段:', user);
        return;
      }
      
      const response = await messageApi.getConversations(user.uuid, token);
      
      if (response.status && response.data.conversations) {
        // 转换后端数据格式为前端需要的格式
        const conversationUsers = response.data.conversations.map(conv => {
          console.log('[MESSAGES] 处理对话数据:', conv);
          
          // 处理最后一条消息
          let lastMessageText = conv.lastMessage.content;
          let lastMessageImageUrl = null;
          
          // 如果是已删除的消息，显示特殊文本
          if (conv.lastMessage.status === 'deleted' || conv.lastMessage.content === '[消息已删除]') {
            lastMessageText = '🗑️ 消息已删除';
          }
          // 如果是图片消息，特殊处理
          else if (conv.lastMessage.message_type === 'image' && conv.lastMessage.file_url) {
            lastMessageText = '📷 阅后即焚图片';
            lastMessageImageUrl = conv.lastMessage.file_url;
          }
          
          return {
            id: conv.otherUser.uuid,
            name: conv.otherUser.nickname,
            avatar: conv.otherUser.avatar,
            lastMessage: lastMessageText,
            lastMessageImageUrl: lastMessageImageUrl, // 添加图片URL字段
            lastTime: (() => {
              try {
                const date = new Date(conv.lastMessage.created_at);
                if (isNaN(date.getTime())) {
                  return '--:--';
                }
                return date.toLocaleTimeString('zh-CN', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                });
              } catch (error) {
                console.warn('[Messages] 时间格式化错误:', error);
                return '--:--';
              }
            })(),
            unreadCount: conv.unreadCount || 0,
          };
        });
        
        setUsers(conversationUsers);
        console.log('消息列表加载成功:', conversationUsers.length, '个对话');
      } else {
        console.warn('加载消息列表失败:', response.message);
        setUsers([]);
      }
    } catch (error) {
      console.error('加载消息列表失败:', error);
    }
  };

  // 添加新用户到消息列表（当收到新消息时调用）
  const addUserToMessages = useCallback((senderUuid, senderName, lastMessage, messageType = 'text', imageUrl = null) => {
    // 确保 senderUuid 不为空
    if (!senderUuid) {
      console.warn('addUserToMessages: senderUuid is null or undefined');
      return;
    }

    setUsers(prev => {
      const existingIndex = prev.findIndex(u => u.id === senderUuid);
      if (existingIndex >= 0) {
        // 更新现有用户
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          lastMessage,
          lastMessageImageUrl: imageUrl,
          lastTime: (() => {
            try {
              return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            } catch (error) {
              console.warn('[Messages] 当前时间格式化错误:', error);
              return '--:--';
            }
          })(),
          unreadCount: (updated[existingIndex].unreadCount || 0) + 1,
        };
        // 移到最前面
        const [moved] = updated.splice(existingIndex, 1);
        return [moved, ...updated];
      } else {
        // 添加新用户
        const newUser = {
          id: senderUuid,
          name: senderName || '陌生人',
          avatar: '👤',
          lastMessage,
          lastMessageImageUrl: imageUrl,
          lastTime: (() => {
            try {
              return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
            } catch (error) {
              console.warn('[Messages] 当前时间格式化错误:', error);
              return '--:--';
            }
          })(),
          unreadCount: 1,
        };
        return [newUser, ...prev];
      }
    });
  }, []);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchText.toLowerCase())
  );

  // 删除对话
  const deleteConversation = async (item) => {
    Alert.alert(
      '删除对话',
      `确定要删除与 ${item.name} 的对话吗？\n\n此操作将删除所有聊天记录且无法恢复。`,
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[MESSAGES] 开始删除对话:', item.id, item.name);
              
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('提示', '请先登录');
                return;
              }

              // 调用后端API删除对话和所有消息
              const response = await messageApi.deleteConversation(item.id, token);
              
              console.log('[MESSAGES] 删除对话响应:', response);
              
              if (response.status) {
                // 从本地列表移除
                setUsers(prev => prev.filter(user => user.id !== item.id));
                console.log('[MESSAGES] 对话已删除:', item.id, '删除了', response.deletedCount, '条消息');
                
                // 刷新消息列表
                console.log('[MESSAGES] 刷新消息列表...');
                await loadConversations();
              } else {
                console.error('[MESSAGES] 删除对话失败:', response.message);
                Alert.alert('删除失败', response.message || '删除对话失败');
              }
            } catch (error) {
              console.error('[MESSAGES] 删除对话异常:', error);
              
              // 根据错误类型给出不同的提示
              let errorMessage = '删除失败，请稍后再试';
              if (error.name === 'AbortError' || error.message?.includes('Aborted')) {
                errorMessage = '操作超时，请检查网络连接后重试';
              } else if (error.message?.includes('Network request failed')) {
                errorMessage = '网络连接失败，请检查网络后重试';
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              Alert.alert('删除失败', errorMessage);
            }
          }
        }
      ]
    );
  };

  const renderUserItem = ({ item }) => (
    <View style={styles.cardContainer}>
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.getParent()?.navigate('ChatDetail', { user: item })}
        onLongPress={() => {
          console.log('[MESSAGES] 长按对话卡片:', item.id, item.name);
          deleteConversation(item);
        }}
        delayLongPress={800}
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          {/* 头像区域 */}
          <View style={styles.avatarContainer}>
            {typeof item.avatar === 'string' && item.avatar.startsWith('http') ? (
              <Image source={{ uri: item.avatar }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarEmoji}>{item.avatar || '👤'}</Text>
              </View>
            )}
            {item.unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          
          {/* 消息信息区域 */}
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{item.name}</Text>
              <Text style={styles.lastTime}>{item.lastTime}</Text>
            </View>
            <Text style={[
              styles.lastMessage,
              item.lastMessageImageUrl && styles.imageMessage
            ]} numberOfLines={2}>
              {item.lastMessage}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 消息</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="搜索联系人..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => (item.id != null ? String(item.id) : Math.random().toString())}
        style={styles.userList}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 15,
    paddingTop: 15,
    paddingBottom: 10,
  },
  searchInput: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  userList: {
    flex: 1,
    paddingHorizontal: 15,
  },
  // 卡片容器
  cardContainer: {
    marginVertical: 6,
    position: 'relative',
  },
  // 卡片主体
  userCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'center',
  },
  // 头像容器
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 28,
    textAlign: 'center',
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: '#F0F2F5',
  },
  unreadBadge: {
    position: 'absolute',
    top: -3,
    right: -3,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  // 消息信息
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  userName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1C1C1E',
    flex: 1,
  },
  lastTime: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 15,
    color: '#8E8E93',
    lineHeight: 20,
  },
  imageMessage: {
    color: '#007AFF',
    fontWeight: '500',
  },
});
