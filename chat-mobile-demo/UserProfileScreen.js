import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './services/apiService';

export default function UserProfileScreen({ route, navigation }) {
  const { userId, userUuid } = route.params || {}; // 从路由参数获取用户ID
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [userStats, setUserStats] = useState({
    followingCount: 0,
    followersCount: 0,
    momentsCount: 0,
  });
  const [userMoments, setUserMoments] = useState([]);
  const [currentUserUuid, setCurrentUserUuid] = useState('');

  useEffect(() => {
    loadUserProfile();
  }, [userUuid]);

  // 加载用户主页数据
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      const currentUserInfo = await AsyncStorage.getItem('userInfo');
      
      if (!token || !currentUserInfo) {
        Alert.alert('提示', '请先登录');
        navigation.goBack();
        return;
      }

      const currentUser = JSON.parse(currentUserInfo);
      setCurrentUserUuid(currentUser.uuid);

      // 判断是否是当前用户自己的主页
      const isSelf = !userUuid || userUuid === currentUser.uuid;
      setIsCurrentUser(isSelf);

      // 获取用户信息
      const targetUuid = userUuid || currentUser.uuid;
      
      // 如果是自己，使用本地数据
      if (isSelf) {
        setUserInfo({
          uuid: currentUser.uuid,
          phone: currentUser.phone,
          username: currentUser.username || currentUser.nickname || `用户${currentUser.phone?.slice(-4)}`,
          nickname: currentUser.nickname || currentUser.username || `用户${currentUser.phone?.slice(-4)}`,
          avatar: currentUser.avatar || '👤',
          bio: currentUser.bio || '这个人很懒，什么都没留下~',
        });
      } else {
        // TODO: 从API获取其他用户信息
        setUserInfo({
          uuid: targetUuid,
          username: `用户${targetUuid.slice(-4)}`,
          nickname: `用户${targetUuid.slice(-4)}`,
          avatar: '👤',
          bio: '这个人很懒，什么都没留下~',
        });
      }

      // 获取统计数据
      await loadUserStats(targetUuid, token);

      // 获取用户动态
      await loadUserMoments(targetUuid, token);

      // 如果不是自己，检查关注状态
      if (!isSelf) {
        await checkFollowStatus(targetUuid, token);
      }

    } catch (error) {
      console.error('加载用户主页失败:', error);
      Alert.alert('错误', '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载用户统计数据
  const loadUserStats = async (targetUuid, token) => {
    try {
      // 获取关注数
      const followingRes = await userApi.getFollowingList(targetUuid, { page: 1, pageSize: 1 }, token);
      const followingCount = followingRes.status && followingRes.data ? followingRes.data.total || 0 : 0;

      // 获取粉丝数
      const followersRes = await userApi.getFollowersList(targetUuid, { page: 1, pageSize: 1 }, token);
      const followersCount = followersRes.status && followersRes.data ? followersRes.data.total || 0 : 0;

      // 获取动态数 (从动态列表中筛选)
      const momentsRes = await userApi.getMoments({ page: 1, pageSize: 1, status: 'approved' }, token);
      const momentsCount = momentsRes.status && momentsRes.data ? momentsRes.data.total || 0 : 0;

      setUserStats({
        followingCount,
        followersCount,
        momentsCount,
      });
    } catch (error) {
      console.error('加载统计数据失败:', error);
    }
  };

  // 加载用户动态列表
  const loadUserMoments = async (targetUuid, token) => {
    try {
      const response = await userApi.getMoments({ 
        page: 1, 
        pageSize: 20,
        status: 'approved',
        privacy: 'public'
      }, token);

      if (response.status && response.data && response.data.list) {
        // 过滤出当前用户的动态
        const userMomentsList = response.data.list.filter(
          moment => moment.author.uuid === targetUuid
        );
        setUserMoments(userMomentsList);
        
        // 更新动态数量
        setUserStats(prev => ({ ...prev, momentsCount: userMomentsList.length }));
      }
    } catch (error) {
      console.error('加载用户动态失败:', error);
    }
  };

  // 检查关注状态
  const checkFollowStatus = async (targetUuid, token) => {
    try {
      const response = await userApi.checkFollowStatus(targetUuid, token);
      if (response.status && response.data) {
        setIsFollowing(response.data.is_following);
      }
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  };

  // 关注/取消关注
  const handleFollowToggle = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      const response = await userApi.followUser(userInfo.uuid, token);
      if (response.status) {
        setIsFollowing(response.data.is_following);
        setUserStats(prev => ({
          ...prev,
          followersCount: response.data.followers_count || prev.followersCount
        }));
        Alert.alert('成功', response.message);
      } else {
        Alert.alert('错误', response.message || '操作失败');
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      Alert.alert('错误', '网络错误，请重试');
    }
  };

  // 下拉刷新
  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  // 查看动态详情
  const handleViewMoment = (moment) => {
    navigation.navigate('MomentDetail', { momentId: moment.uuid });
  };

  // 查看关注列表
  const handleViewFollowing = () => {
    navigation.navigate('FollowingList', { userUuid: userInfo.uuid });
  };

  // 查看粉丝列表
  const handleViewFollowers = () => {
    navigation.navigate('FollowersList', { userUuid: userInfo.uuid });
  };

  // 编辑个人资料
  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { userInfo });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!userInfo) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>用户不存在</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>返回</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>个人主页</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* 用户信息卡片 */}
      <View style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Text style={styles.avatar}>{userInfo.avatar}</Text>
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{userInfo.nickname}</Text>
            <Text style={styles.bio}>{userInfo.bio}</Text>
          </View>
        </View>

        {/* 统计数据 */}
        <View style={styles.statsContainer}>
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowing}>
            <Text style={styles.statNumber}>{userStats.followingCount}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowers}>
            <Text style={styles.statNumber}>{userStats.followersCount}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{userStats.momentsCount}</Text>
            <Text style={styles.statLabel}>动态</Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          {isCurrentUser ? (
            <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
              <Text style={styles.editButtonText}>编辑资料</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.followButton, isFollowing && styles.followingButton]} 
              onPress={handleFollowToggle}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowing ? '已关注' : '+ 关注'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 动态列表 */}
      <View style={styles.momentsSection}>
        <Text style={styles.sectionTitle}>TA的动态</Text>
        {userMoments.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>还没有发布动态</Text>
          </View>
        ) : (
          <View style={styles.momentsList}>
            {userMoments.map((moment) => (
              <TouchableOpacity 
                key={moment.uuid} 
                style={styles.momentCard}
                onPress={() => handleViewMoment(moment)}
              >
                <Text style={styles.momentContent} numberOfLines={3}>
                  {moment.content}
                </Text>
                {moment.images && moment.images.length > 0 && (
                  <View style={styles.momentImages}>
                    {moment.images.slice(0, 3).map((img, index) => (
                      <Image key={index} source={{ uri: img }} style={styles.momentImage} />
                    ))}
                  </View>
                )}
                <View style={styles.momentFooter}>
                  <Text style={styles.momentTime}>{formatTime(moment.created_at)}</Text>
                  <View style={styles.momentStats}>
                    <Text style={styles.momentStat}>❤️ {moment.likes_count || 0}</Text>
                    <Text style={styles.momentStat}>💬 {moment.comments_count || 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

// 时间格式化
const formatTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return `${date.getMonth() + 1}-${date.getDate()}`;
  } else if (days > 0) {
    return `${days}天前`;
  } else if (hours > 0) {
    return `${hours}小时前`;
  } else if (minutes > 0) {
    return `${minutes}分钟前`;
  } else {
    return '刚刚';
  }
};

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
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
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
  profileCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    fontSize: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 80,
    marginRight: 15,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
    marginBottom: 15,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  followButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  followButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  followingButton: {
    backgroundColor: '#E5E5EA',
  },
  followingButtonText: {
    color: '#666',
  },
  momentsSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  momentsList: {
    gap: 15,
  },
  momentCard: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  momentContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
    marginBottom: 10,
  },
  momentImages: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  momentImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
  },
  momentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  momentTime: {
    fontSize: 12,
    color: '#999',
  },
  momentStats: {
    flexDirection: 'row',
    gap: 15,
  },
  momentStat: {
    fontSize: 12,
    color: '#666',
  },
});

