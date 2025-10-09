import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import momentService from './services/momentService';
import { getImageUrl } from './config/api';

const { width: screenWidth } = Dimensions.get('window');

export default function MomentsScreen({ navigation }) {
  const [moments, setMoments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // 加载动态列表
  const loadMoments = useCallback(async (pageNum = 1, isRefresh = false) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        Alert.alert('提示', '请先登录');
        return;
      }

      console.log('[Moments] 加载动态列表，页码:', pageNum);
      
      const response = await momentService.getMomentList(pageNum, 10, null, token);
      
      if (response.status && response.data) {
        const newMoments = response.data.list;
        
        if (isRefresh) {
          setMoments(newMoments);
        } else {
          setMoments(prev => [...prev, ...newMoments]);
        }
        
        setHasMore(newMoments.length === 10);
        setPage(pageNum);
        
        console.log('[Moments] 加载成功，当前动态数:', newMoments.length);
      }
    } catch (error) {
      console.error('[Moments] 加载动态失败:', error);
      Alert.alert('错误', '加载动态失败');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loading]);

  // 刷新
  const handleRefresh = () => {
    setRefreshing(true);
    loadMoments(1, true);
  };

  // 加载更多
  const handleLoadMore = () => {
    if (hasMore && !loading) {
      loadMoments(page + 1, false);
    }
  };

  // 点赞
  const handleLike = async (momentUuid, index) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const response = await momentService.likeMoment(momentUuid, token);
      
      if (response.status) {
        // 更新点赞数
        setMoments(prev => {
          const newMoments = [...prev];
          newMoments[index].likesCount = response.data.likesCount;
          return newMoments;
        });
      }
    } catch (error) {
      console.error('[Moments] 点赞失败:', error);
    }
  };

  // 删除动态
  const handleDelete = async (momentUuid, index) => {
    Alert.alert(
      '确认删除',
      '确定要删除这条动态吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              const response = await momentService.deleteMoment(momentUuid, token);
              
              if (response.status) {
                // 从列表中移除
                setMoments(prev => prev.filter((_, i) => i !== index));
                Alert.alert('成功', '删除成功');
              }
            } catch (error) {
              console.error('[Moments] 删除失败:', error);
              Alert.alert('错误', '删除失败');
            }
          }
        }
      ]
    );
  };

  // 格式化时间
  const formatTime = (dateString) => {
    const now = Date.now();
    const time = new Date(dateString).getTime();
    const diff = now - time;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // 渲染图片
  const renderImages = (images) => {
    if (!images || images.length === 0) return null;
    
    const imageCount = images.length;
    let columns = 3;
    if (imageCount === 1) columns = 1;
    else if (imageCount === 2 || imageCount === 4) columns = 2;
    
    const imageSize = imageCount === 1 
      ? screenWidth - 80 
      : (screenWidth - 80 - 20) / columns;
    
    return (
      <View style={styles.imagesContainer}>
        {images.map((image, index) => (
          <Image
            key={index}
            source={{ uri: getImageUrl(image.url) }}
            style={[
              styles.momentImage,
              {
                width: imageSize,
                height: imageSize,
                marginRight: (index + 1) % columns === 0 ? 0 : 10,
                marginBottom: 10,
              }
            ]}
            resizeMode="cover"
          />
        ))}
      </View>
    );
  };

  // 渲染动态项
  const renderMomentItem = ({ item, index }) => {
    const currentUser = moments[index]?.user;
    
    return (
      <View style={styles.momentCard}>
        {/* 用户信息 */}
        <View style={styles.userHeader}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {currentUser?.username?.charAt(0) || '?'}
              </Text>
            </View>
            <View style={styles.userDetail}>
              <Text style={styles.username}>{currentUser?.username || '未知用户'}</Text>
              <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={() => handleDelete(item.uuid, index)}>
            <Text style={styles.deleteButton}>删除</Text>
          </TouchableOpacity>
        </View>

        {/* 动态内容 */}
        {item.content ? (
          <Text style={styles.content}>{item.content}</Text>
        ) : null}

        {/* 图片 */}
        {renderImages(item.images)}

        {/* 动态位置 */}
        {item.location ? (
          <View style={styles.locationContainer}>
            <Text style={styles.locationText}>📍 {item.location}</Text>
          </View>
        ) : null}

        {/* 互动栏 */}
        <View style={styles.actionsBar}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => handleLike(item.uuid, index)}
          >
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.actionText}>{item.likesCount || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionText}>{item.commentsCount || 0}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>🔗</Text>
            <Text style={styles.actionText}>分享</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  useEffect(() => {
    loadMoments(1, true);
  }, []);

  return (
    <View style={styles.container}>
      <FlatList
        data={moments}
        renderItem={renderMomentItem}
        keyExtractor={(item) => item.uuid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#007AFF"
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>暂无动态</Text>
              <TouchableOpacity 
                style={styles.publishButton}
                onPress={() => navigation.navigate('PublishMoment')}
              >
                <Text style={styles.publishButtonText}>发布第一条动态</Text>
              </TouchableOpacity>
            </View>
          )
        }
        ListFooterComponent={
          loading && moments.length > 0 && (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          )
        }
      />
      
      {/* 悬浮发布按钮 */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => navigation.navigate('PublishMoment')}
      >
        <Text style={styles.fabIcon}>✏️</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  momentCard: {
    backgroundColor: 'white',
    marginBottom: 10,
    padding: 15,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  userDetail: {
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  time: {
    fontSize: 12,
    color: '#999',
  },
  deleteButton: {
    fontSize: 14,
    color: '#ff4757',
  },
  content: {
    fontSize: 15,
    lineHeight: 22,
    color: '#333',
    marginBottom: 12,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  momentImage: {
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  locationContainer: {
    marginBottom: 12,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
  },
  actionsBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  actionIcon: {
    fontSize: 16,
    marginRight: 5,
  },
  actionText: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
  },
  emptyText: {
    fontSize: 15,
    color: '#999',
    marginBottom: 20,
  },
  publishButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  publishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fabIcon: {
    fontSize: 24,
  },
});

