import React, { useState, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './services/apiService';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function UserProfileScreen({ route, navigation }) {
  const { userId, userUuid, userInfo: passedUserInfo } = route.params || {}; // 从路由参数获取用户ID和初始用户信息
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [userInfo, setUserInfo] = useState(passedUserInfo || null); // 使用传递过来的初始信息
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

  // 监听页面焦点，从编辑资料页面返回时刷新数据
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // 页面获得焦点时重新加载用户信息
      if (isCurrentUser) {
        loadUserProfile();
      }
    });

    return unsubscribe;
  }, [navigation, isCurrentUser]);

  // 加载用户主页数据
  const loadUserProfile = async () => {
    try {
      // 如果有传递过来的用户信息，先不显示loading，让页面立即显示
      if (!passedUserInfo) {
        setLoading(true);
      }
      
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
        // 如果有传递过来的用户信息，优先使用；否则使用默认值
        if (!passedUserInfo) {
          setUserInfo({
            uuid: targetUuid,
            username: `用户${targetUuid.slice(-4)}`,
            nickname: `用户${targetUuid.slice(-4)}`,
            avatar: '👤',
            bio: '这个人很懒，什么都没留下~',
          });
        }
        // 如果有传递的信息，已经在useState初始化时设置了，这里不需要再次设置
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
      const momentsRes = await userApi.getMoments({ page: 1, pageSize: 1, status: 'published' }, token);
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
        status: 'published',
        privacy: 'public'
      }, token);

      if (response.status && response.data && response.data.list) {
        // 过滤出当前用户的动态
        const userMomentsList = response.data.list.filter(
          moment => moment.author.uuid === targetUuid
        );
        setUserMoments(userMomentsList);
        
        // 如果动态列表有数据，从第一条动态中获取作者完整信息来更新userInfo
        if (userMomentsList.length > 0 && userMomentsList[0].author) {
          const authorInfo = userMomentsList[0].author;
          setUserInfo(prevInfo => ({
            ...prevInfo,
            uuid: authorInfo.uuid || prevInfo.uuid,
            nickname: authorInfo.nickname || prevInfo.nickname,
            username: authorInfo.nickname || prevInfo.username,
            avatar: authorInfo.avatar || prevInfo.avatar,
            // bio保持不变，因为动态中没有bio信息
          }));
        }
        
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
    navigation.navigate('FollowList', { type: 'following', userUuid: userInfo.uuid });
  };

  // 查看粉丝列表
  const handleViewFollowers = () => {
    navigation.navigate('FollowList', { type: 'followers', userUuid: userInfo.uuid });
  };

  // 编辑个人资料
  const handleEditProfile = () => {
    navigation.navigate('EditProfile', { userInfo });
  };

  // 发送消息
  const handleSendMessage = () => {
    navigation.navigate('ChatDetail', { 
      user: {
        id: userInfo.uuid,
        name: userInfo.nickname,
        avatar: userInfo.avatar,
      }
    });
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
    <View style={styles.container}>
      <ScrollView 
        style={styles.fullScrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 顶部封面图 */}
        <View style={styles.coverSection}>
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          >
            {/* 返回按钮 */}
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
              <Text style={styles.backButtonText}>‹</Text>
            </TouchableOpacity>
          </LinearGradient>
          
          {/* 头像悬浮在封面下方 */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrapper}>
              {userInfo.avatar && userInfo.avatar.startsWith('http') ? (
                <Image 
                  source={{ uri: userInfo.avatar }} 
                  style={styles.avatarImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarEmoji}>{userInfo.avatar || '👤'}</Text>
                </View>
              )}
              {!isCurrentUser && (
                <View style={styles.avatarBadge}>
                  <Text style={styles.avatarBadgeText}>👋</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 用户信息卡片 */}
        <View style={styles.userInfoCard}>
          <Text style={styles.username}>{userInfo.nickname}</Text>
          <Text style={styles.bio}>{userInfo.bio || '这个人很懒，什么都没留下~'}</Text>
          
          {/* 统计数据 */}
          <View style={styles.statsRow}>
            <TouchableOpacity style={styles.statItem} onPress={handleViewFollowing}>
              <Text style={styles.statNumber}>{userStats.followingCount}</Text>
              <Text style={styles.statLabel}>关注</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.statItem} onPress={handleViewFollowers}>
              <Text style={styles.statNumber}>{userStats.followersCount}</Text>
              <Text style={styles.statLabel}>粉丝</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userStats.momentsCount}</Text>
              <Text style={styles.statLabel}>动态</Text>
            </View>
          </View>
        </View>

        {/* 非当前用户才显示操作按钮 */}
        {!isCurrentUser && (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity 
              style={[styles.followButtonNew, isFollowing && styles.followingButtonNew]} 
              onPress={handleFollowToggle}
            >
              <Text style={[styles.followButtonTextNew, isFollowing && styles.followingButtonTextNew]}>
                {isFollowing ? '✓ 已关注' : '+ 关注'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.messageButtonNew} 
              onPress={handleSendMessage}
            >
              <Text style={styles.messageButtonTextNew}>💬 发消息</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 动态列表 */}
        <View style={styles.momentsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isCurrentUser ? '我的动态' : 'TA的动态'}
            </Text>
            <Text style={styles.sectionCount}>{userMoments.length}条</Text>
          </View>
          
          {userMoments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📝</Text>
              <Text style={styles.emptyText}>还没有发布动态</Text>
            </View>
          ) : (
            <View style={styles.momentsList}>
              {userMoments.map((moment) => (
                <TouchableOpacity 
                  key={moment.uuid} 
                  style={styles.momentCard}
                  onPress={() => handleViewMoment(moment)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.momentContent} numberOfLines={3}>
                    {moment.content}
                  </Text>
                  {moment.images && moment.images.length > 0 && (
                    <View style={styles.momentImages}>
                      {moment.images.slice(0, 3).map((img, index) => (
                        <Image key={index} source={{ uri: img }} style={styles.momentImage} />
                      ))}
                      {moment.images.length > 3 && (
                        <View style={styles.moreImagesOverlay}>
                          <Text style={styles.moreImagesText}>+{moment.images.length - 3}</Text>
                        </View>
                      )}
                    </View>
                  )}
                  <View style={styles.momentFooter}>
                    <Text style={styles.momentTime}>{formatTime(moment.created_at)}</Text>
                    <View style={styles.momentStats}>
                      <View style={styles.momentStatItem}>
                        <Text style={styles.momentStatIcon}>❤️</Text>
                        <Text style={styles.momentStatText}>{moment.likes_count || 0}</Text>
                      </View>
                      <View style={styles.momentStatItem}>
                        <Text style={styles.momentStatIcon}>💬</Text>
                        <Text style={styles.momentStatText}>{moment.comments_count || 0}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* 底部操作按钮（仅当前用户） */}
        {isCurrentUser && (
          <View style={styles.bottomButtonsContainer}>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Text style={styles.bottomButtonText}>✏️ 编辑资料</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.publishButton} 
              onPress={() => navigation.navigate('PublishMoment')}
              activeOpacity={0.8}
            >
              <Text style={styles.bottomButtonText}>📝 发布动态</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
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
    backgroundColor: '#F0F2F5',
  },
  fullScrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F0F2F5',
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
  // 封面区域
  coverSection: {
    position: 'relative',
    marginBottom: 60,
  },
  coverGradient: {
    height: 180,
    width: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: '300',
    marginLeft: -2,
  },
  // 头像区域
  avatarSection: {
    position: 'absolute',
    bottom: -50,
    left: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 5,
    borderColor: 'white',
    backgroundColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: 'white',
  },
  avatarEmoji: {
    fontSize: 50,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarBadgeText: {
    fontSize: 16,
  },
  // 用户信息卡片
  userInfoCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    paddingTop: 20,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
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
    marginBottom: 15,
  },
  // 统计数据行
  statsRow: {
    flexDirection: 'row',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#E5E5EA',
    marginVertical: 5,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#667eea',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: '#999',
  },
  // 操作按钮区域
  actionButtonsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 12,
  },
  followButtonNew: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  followButtonTextNew: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  followingButtonNew: {
    backgroundColor: '#E5E5EA',
  },
  followingButtonTextNew: {
    color: '#666',
  },
  messageButtonNew: {
    flex: 1,
    backgroundColor: '#34C759',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  messageButtonTextNew: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  // 动态区域
  momentsSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#999',
    backgroundColor: '#F0F2F5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  momentsList: {
    gap: 12,
  },
  momentCard: {
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  momentContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 24,
    marginBottom: 12,
  },
  momentImages: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    position: 'relative',
  },
  momentImage: {
    width: (width - 100) / 3,
    height: (width - 100) / 3,
    borderRadius: 8,
  },
  moreImagesOverlay: {
    position: 'absolute',
    right: 6,
    bottom: 0,
    width: (width - 100) / 3,
    height: (width - 100) / 3,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreImagesText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  momentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  momentTime: {
    fontSize: 12,
    color: '#999',
  },
  momentStats: {
    flexDirection: 'row',
    gap: 16,
  },
  momentStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  momentStatIcon: {
    fontSize: 14,
  },
  momentStatText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  // 底部按钮
  bottomButtonsContainer: {
    paddingHorizontal: 15,
    paddingVertical: 20,
    flexDirection: 'row',
    gap: 12,
  },
  publishButton: {
    flex: 1,
    backgroundColor: '#764ba2',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
});

