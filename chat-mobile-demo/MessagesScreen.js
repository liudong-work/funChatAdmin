import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageApi } from './services/apiService.js';

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
          return {
            id: conv.otherUser.uuid,
            name: conv.otherUser.nickname,
            avatar: conv.otherUser.avatar,
            lastMessage: conv.lastMessage.content,
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
  const addUserToMessages = useCallback((senderUuid, senderName, lastMessage) => {
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

  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => navigation.getParent()?.navigate('ChatDetail', { user: item })}
    >
      <View style={styles.avatarContainer}>
        <Text style={styles.avatar}>{item.avatar}</Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadText}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.lastTime}>{item.lastTime}</Text>
        </View>
        <Text style={styles.lastMessage} numberOfLines={1}>
          {item.lastMessage}
        </Text>
      </View>
    </TouchableOpacity>
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  searchContainer: {
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  searchInput: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    fontSize: 16,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    backgroundColor: 'white',
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    fontSize: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 50,
  },
  unreadBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  lastTime: {
    fontSize: 12,
    color: '#999',
  },
  lastMessage: {
    fontSize: 14,
    color: '#666',
  },
});
