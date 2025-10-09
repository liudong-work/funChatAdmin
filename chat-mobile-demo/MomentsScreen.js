import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  SafeAreaView,
  RefreshControl,
  Alert,
} from 'react-native';
import { userApi } from './services/apiService.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function MomentsScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('latest'); // 'follow' 或 'latest'
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [moments, setMoments] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载动态数据
  const loadMoments = async (pageNum = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setPage(1);
        setHasMore(true);
      }

      setLoading(true);
      
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      const response = await userApi.getMoments({
        page: pageNum,
        pageSize: 10,
        status: 'approved',
        privacy: 'public'
      }, token);

      if (response.status) {
        const newMoments = response.data.list;
        
        if (isRefresh || pageNum === 1) {
          setMoments(newMoments);
        } else {
          setMoments(prev => [...prev, ...newMoments]);
        }
        
        setHasMore(newMoments.length === 10);
        setPage(pageNum);
      } else {
        Alert.alert('错误', response.message || '加载动态失败');
      }
    } catch (error) {
      console.error('加载动态失败:', error);
      Alert.alert('错误', '网络错误，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadMoments(1, true);
  }, []);

  // 格式化时间
  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    if (diffHours < 24) return `${diffHours}小时前`;
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  // 根据选项卡过滤数据（目前只显示最新，关注功能待实现）
  const filteredMoments = activeTab === 'follow' 
    ? moments.filter(m => m.isFollowing) // 暂时没有关注功能
    : moments;

  const onRefresh = () => {
    loadMoments(1, true);
  };

  const handleLike = (id) => {
    // 点赞功能（这里只是演示，实际应该调用API）
    console.log('点赞:', id);
  };

  const renderMomentItem = ({ item }) => (
    <View style={styles.momentCard}>
      <View style={styles.momentHeader}>
        <View style={styles.userInfo}>
          <Text style={styles.userAvatar}>{item.author.avatar}</Text>
          <View>
            <Text style={styles.userName}>{item.author.nickname}</Text>
            <Text style={styles.time}>{formatTime(item.created_at)}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.content}>{item.content}</Text>

      {item.images && item.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {item.images.map((img, index) => (
            <Image key={index} source={{ uri: img }} style={styles.image} />
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleLike(item.id)}
        >
          <Text style={styles.actionIcon}>👍</Text>
          <Text style={styles.actionText}>{item.likes_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionIcon}>🔄</Text>
          <Text style={styles.actionText}>分享</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⭐ 动态</Text>
      </View>

      {/* 选项卡 */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'follow' && styles.activeTab]}
          onPress={() => setActiveTab('follow')}
        >
          <Text style={[styles.tabText, activeTab === 'follow' && styles.activeTabText]}>
            关注
          </Text>
          {activeTab === 'follow' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'latest' && styles.activeTab]}
          onPress={() => setActiveTab('latest')}
        >
          <Text style={[styles.tabText, activeTab === 'latest' && styles.activeTabText]}>
            最新
          </Text>
          {activeTab === 'latest' && <View style={styles.tabIndicator} />}
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredMoments}
        renderItem={renderMomentItem}
        keyExtractor={(item) => item.uuid || item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === 'follow' ? '暂无关注的动态' : '暂无动态'}
            </Text>
          </View>
        }
      />

      {/* 悬浮发布按钮 */}
      <TouchableOpacity 
        style={styles.floatingPublishButton}
        onPress={() => navigation.navigate('PublishMoment')}
      >
        <Text style={styles.floatingPublishButtonText}>✏️</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingTop: 45,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeTab: {
    // 激活状态（可选）
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 40,
    height: 3,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  listContent: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  momentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  momentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    fontSize: 40,
    marginRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  content: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 5,
    marginBottom: 5,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 15,
  },
  actionIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  floatingPublishButton: {
    position: 'absolute',
    right: 20,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  floatingPublishButtonText: {
    fontSize: 24,
    color: 'white',
  },
});

