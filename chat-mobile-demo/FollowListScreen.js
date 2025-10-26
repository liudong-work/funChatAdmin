import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './services/apiService';

export default function FollowListScreen({ route, navigation }) {
  const { type, userUuid } = route.params; // type: 'following' | 'followers'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  // 加载用户列表
  const loadUsers = async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !append) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('提示', '请先登录');
        navigation.goBack();
        return;
      }

      const apiCall = type === 'following' 
        ? userApi.getFollowingList
        : userApi.getFollowersList;

      const response = await apiCall(
        userUuid,
        { page: pageNum, pageSize: 20 },
        token
      );

      if (response.status && response.data) {
        // 统一数据格式，处理后端返回的不同字段名
        const rawUsers = response.data.list || [];
        const newUsers = rawUsers.map(user => ({
          uuid: user.uuid || user.user_uuid,
          user_id: user.user_id,
          phone: user.phone,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          bio: user.bio,
          is_following: user.is_following !== undefined ? user.is_following : true,
          followed_at: user.followed_at
        }));
        
        console.log('[FollowList] 处理后的用户数据:', newUsers);
        
        if (append) {
          setUsers(prev => [...prev, ...newUsers]);
        } else {
          setUsers(newUsers);
        }

        setHasMore(newUsers.length >= 20);
        setPage(pageNum);
      } else {
        Alert.alert('错误', response.message || '加载失败');
      }
    } catch (error) {
      console.error('加载用户列表失败:', error);
      Alert.alert('错误', '加载失败，请重试');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // 下拉刷新
  const onRefresh = () => {
    setRefreshing(true);
    loadUsers(1, false);
  };

  // 加载更多
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadUsers(page + 1, true);
    }
  };

  // 关注/取消关注
  const handleFollowToggle = async (targetUser) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await userApi.followUser(targetUser.uuid, token);
      if (response.status) {
        // 更新本地状态
        setUsers(prevUsers =>
          prevUsers.map(user =>
            user.uuid === targetUser.uuid
              ? { ...user, is_following: response.data.is_following }
              : user
          )
        );
        
        // 如果是关注列表且取消关注，从列表中移除
        if (type === 'following' && !response.data.is_following) {
          setUsers(prevUsers => prevUsers.filter(user => user.uuid !== targetUser.uuid));
        }
      } else {
        Alert.alert('错误', response.message || '操作失败');
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      Alert.alert('错误', '网络错误，请重试');
    }
  };

  // 查看用户主页
  const handleViewProfile = (user) => {
    navigation.navigate('UserProfile', { userUuid: user.uuid });
  };

  // 渲染用户项
  const renderUserItem = ({ item }) => (
    <TouchableOpacity
      style={styles.userItem}
      onPress={() => handleViewProfile(item)}
      activeOpacity={0.7}
    >
      <View style={styles.userInfo}>
        <Text style={styles.avatar}>{item.avatar || '👤'}</Text>
        <View style={styles.userDetails}>
          <Text style={styles.username}>{item.nickname || item.username || `用户${item.uuid?.slice(-4)}`}</Text>
          {item.bio && <Text style={styles.bio} numberOfLines={1}>{item.bio}</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.followButton,
          item.is_following && styles.followingButton
        ]}
        onPress={(e) => {
          e.stopPropagation();
          handleFollowToggle(item);
        }}
      >
        <Text style={[
          styles.followButtonText,
          item.is_following && styles.followingButtonText
        ]}>
          {item.is_following ? '已关注' : '+ 关注'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // 渲染空状态
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {type === 'following' ? '还没有关注任何人' : '还没有粉丝'}
        </Text>
      </View>
    );
  };

  // 渲染底部加载
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoading}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>加载中...</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {type === 'following' ? '关注列表' : '粉丝列表'}
        </Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 用户列表 */}
      <FlatList
        data={users}
        renderItem={renderUserItem}
        keyExtractor={(item, index) => item.uuid || `user-${index}`}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.1}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={users.length === 0 ? styles.emptyList : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#007AFF',
  },
  headerBackButton: {
    padding: 5,
  },
  headerBackText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerPlaceholder: {
    width: 40,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  avatar: {
    fontSize: 40,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 50,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  bio: {
    fontSize: 13,
    color: '#666',
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followingButton: {
    backgroundColor: '#E5E5EA',
  },
  followingButtonText: {
    color: '#666',
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  footerLoading: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
});

