import React, { useEffect } from 'react';
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
import ImageViewing from 'react-native-image-viewing';
import { userApi } from "./services/apiService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMomentStore } from './stores';

export default function MomentsScreen({ navigation }) {
  // ✅ 使用 useMomentStore 替代所有 useState
  const {
    activeTab,
    setActiveTab,
    moments,
    setMoments,
    setLoading,
    setRefreshing,
    setPage,
    setHasMore,
    setLastLoadTime,
    imageViewer,
    showImageViewer,
    hideImageViewer,
    toggleLike,
  } = useMomentStore();
  
  // ✅ 从 store 获取当前标签的数据
  const currentTabData = moments[activeTab];
  const momentsList = currentTabData.list;
  const refreshing = currentTabData.refreshing;
  const loading = currentTabData.loading;
  const page = currentTabData.page;
  const hasMore = currentTabData.hasMore;
  const lastLoadTime = currentTabData.lastLoadTime;

  // ✅ 加载动态数据（使用 store 更新状态）
  const loadMoments = async (pageNum = 1, isRefresh = false) => {
    try {
      // 防抖：避免频繁调用（1秒内只能调用一次）
      const now = Date.now();
      if (now - lastLoadTime < 1000) {
        console.log('[MomentsScreen] 请求过于频繁，跳过此次调用');
        return;
      }
      setLastLoadTime(activeTab, now);

      if (isRefresh) {
        setPage(activeTab, 1);
        setHasMore(activeTab, true);
      }

      setLoading(activeTab, true);
      
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setLoading(activeTab, false);
        return;
      }

      const response = await userApi.getMoments({
        page: pageNum,
        pageSize: 10,
        status: 'published',
        privacy: 'public',
        type: activeTab === 'follow' ? 'following' : 'latest' // 根据Tab类型筛选
      }, token);

      if (response.status) {
        const newMoments = response.data.list || [];
        
        if (isRefresh || pageNum === 1) {
          // ✅ 使用 store 方法设置动态列表
          setMoments(activeTab, newMoments);
        } else {
          // ✅ 追加新动态到现有列表
          setMoments(activeTab, [...momentsList, ...newMoments]);
        }
        
        setHasMore(activeTab, newMoments.length === 10);
        setPage(activeTab, pageNum);
      } else {
        Alert.alert('错误', response.message || '加载动态失败');
      }
    } catch (error) {
      console.error('加载动态失败:', error);
      Alert.alert('错误', '网络错误，请重试');
    } finally {
      setLoading(activeTab, false);
      setRefreshing(activeTab, false);
    }
  };

  // 组件挂载时加载数据
  useEffect(() => {
    loadMoments(1, true);
  }, []);

  // 监听tab切换，重新加载数据
  useEffect(() => {
    console.log('[MomentsScreen] Tab切换到:', activeTab);
    loadMoments(1, true);
  }, [activeTab]);

  // 格式化时间
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      // 处理不同的时间格式
      let date;
      if (typeof dateString === 'string') {
        // 如果是 ISO 格式的字符串，直接解析
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        return '';
      }

      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.error('无效的日期:', dateString);
        return '';
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      
      // 格式化为本地日期时间
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('formatTime 错误:', error, dateString);
      return '';
    }
  };

  const onRefresh = () => {
    setRefreshing(activeTab, true);
    loadMoments(1, true);
  };

  // ✅ 预览图片（使用 store）
  const handlePreviewImage = (momentItem, imageIndex = 0) => {
    if (momentItem.images && momentItem.images.length > 0) {
      showImageViewer(momentItem.images, imageIndex);
    }
  };

  // ✅ 点赞处理（使用 store）
  const handleLike = async (momentItem) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      // ✅ 乐观更新UI（使用 store）
      const newIsLiked = !momentItem.is_liked;
      const newLikesCount = momentItem.is_liked ? momentItem.likes_count - 1 : momentItem.likes_count + 1;
      toggleLike(momentItem.uuid, newIsLiked, newLikesCount);

      // 调用API
      const response = await userApi.likeMoment(momentItem.uuid, token);
      
      if (!response.status) {
        // ✅ 如果失败，回滚UI
        toggleLike(momentItem.uuid, momentItem.is_liked, momentItem.likes_count);
        Alert.alert('错误', response.message || '点赞失败');
      } else {
        // ✅ 使用服务器返回的最新数据更新
        toggleLike(momentItem.uuid, response.data.is_liked, response.data.likes_count);
      }
    } catch (error) {
      console.error('点赞失败:', error);
      // ✅ 回滚UI
      toggleLike(momentItem.uuid, momentItem.is_liked, momentItem.likes_count);
      Alert.alert('错误', '网络错误，请重试');
    }
  };

  const renderMomentItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.momentCard}
      onPress={() => {
        console.log('跳转到动态详情，传递的数据:', item);
        navigation.navigate('MomentDetail', { moment: item });
      }}
      activeOpacity={0.7}
    >
      <View style={styles.momentHeader}>
        <TouchableOpacity 
          style={styles.userInfo}
          onPress={(e) => {
            e.stopPropagation(); // 阻止触发动态卡片点击
            if (item.author.uuid) {
              navigation.navigate('UserProfile', { 
                userUuid: item.author.uuid,
                userInfo: {
                  uuid: item.author.uuid,
                  nickname: item.author.nickname,
                  avatar: item.author.avatar
                }
              });
            }
          }}
          activeOpacity={0.7}
        >
          {item.author.avatar && item.author.avatar.startsWith('http') ? (
            <Image source={{ uri: item.author.avatar }} style={styles.userAvatarImage} />
          ) : (
            <Text style={styles.userAvatar}>{item.author.avatar || '👤'}</Text>
          )}
          <View>
            <Text style={styles.userName}>{item.author.nickname}</Text>
            {item.created_at ? (
              <Text style={styles.time}>{formatTime(item.created_at)}</Text>
            ) : (
              <Text style={styles.time}>时间未知</Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.content}>{item.content}</Text>

      {item.images && item.images.length > 0 && (
        <View style={styles.imagesContainer}>
          {item.images.map((img, index) => (
            <TouchableOpacity 
              key={index} 
              onPress={(e) => {
                e.stopPropagation(); // 阻止事件冒泡到卡片点击
                handlePreviewImage(item, index);
              }}
            >
              <Image source={{ uri: img }} style={styles.image} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation(); // 阻止事件冒泡到卡片点击
            handleLike(item);
          }}
        >
          <Text style={[styles.actionIcon, item.is_liked && styles.likedIcon]}>
            {item.is_liked ? '❤️' : '🤍'}
          </Text>
          <Text style={[styles.actionText, item.is_liked && styles.likedText]}>
            {item.likes_count}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation(); // 阻止事件冒泡到卡片点击
            navigation.navigate('MomentDetail', { moment: item });
          }}
        >
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{item.comments_count}</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
        data={momentsList}
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

      {/* ✅ 图片查看器（使用 store 状态） */}
      <ImageViewing
        images={imageViewer.images.map(uri => ({ uri }))}
        imageIndex={imageViewer.currentIndex}
        visible={imageViewer.visible}
        onRequestClose={hideImageViewer}
        enableSwipeDown={true}
        swipeDownThreshold={50}
        backgroundColor="rgba(0, 0, 0, 0.9)"
        doubleTapToZoomEnabled={true}
        enablePreload={true}
        presentationStyle="overFullScreen"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#E3F2FD', // 淡蓝色背景
    paddingVertical: 15,
    paddingTop: 45,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 5,
  },
  headerTitle: {
    color: '#1976D2', // 深蓝色文字
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
  userAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  likedIcon: {
    // 已点赞的图标样式
  },
  likedText: {
    color: '#FF3B30',
    fontWeight: 'bold',
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

