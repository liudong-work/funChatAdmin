import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { userApi, pointsApi } from './services/apiService';
import { useAuthStore } from './stores';

export default function ProfileScreen({ navigation }) {
  // 使用 Zustand 状态管理
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const logout = useAuthStore(state => state.logout);
  
  // 处理后的用户信息（用于显示）
  const userInfo = useMemo(() => ({
    name: user?.nickname || user?.username || '我的昵称',
    avatar: user?.avatar || '👤',
    phone: user?.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '138****8888',
    email: user?.email || 'user@example.com',
    joinDate: '2024-01-01',
    uuid: user?.uuid || '',
  }), [user]);
  
  const [followStats, setFollowStats] = useState({
    followingCount: 0,
    followersCount: 0,
  });

  const [pointsInfo, setPointsInfo] = useState({
    points: 0,
    continuous_days: 0,
    is_checked_in_today: false,
  });

  const [momentCount, setMomentCount] = useState(0);

  // 加载数据
  useEffect(() => {
    if (userInfo.uuid && token) {
      loadFollowStats();
      loadPointsInfo();
      loadMomentCount();
    }
  }, [userInfo.uuid, token]);

  // 监听页面焦点，从编辑资料页面返回时刷新数据
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // 页面获得焦点时重新加载数据
      if (userInfo.uuid && token) {
        loadPointsInfo();
        loadMomentCount();
      }
    });

    return unsubscribe;
  }, [navigation, userInfo.uuid, token]);

  // 加载积分信息
  const loadPointsInfo = async () => {
    try {
      if (!token) return;
      
      const response = await pointsApi.getPointsInfo(token);
      if (response && response.status) {
        setPointsInfo(response.data);
      }
    } catch (error) {
      console.error('加载积分信息失败:', error);
    }
  };

  // 加载关注统计数据
  const loadFollowStats = async () => {
    try {
      if (!token) return;

      // 获取关注列表
      const followingRes = await userApi.getFollowingList(null, { page: 1, pageSize: 1 }, token);
      if (followingRes.status && followingRes.data) {
        setFollowStats(prev => ({ ...prev, followingCount: followingRes.data.total || 0 }));
      }

      // 获取粉丝列表
      const followersRes = await userApi.getFollowersList(null, { page: 1, pageSize: 1 }, token);
      if (followersRes.status && followersRes.data) {
        setFollowStats(prev => ({ ...prev, followersCount: followersRes.data.total || 0 }));
      }
    } catch (error) {
      console.error('加载关注统计失败:', error);
    }
  };

  // 加载用户动态数量
  const loadMomentCount = async (userUuid = null) => {
    try {
      const uuid = userUuid || userInfo.uuid;
      if (!token || !uuid) return;

      const response = await userApi.getUserMoments(uuid, { page: 1, pageSize: 1 }, token);
      if (response && response.status && response.data) {
        setMomentCount(response.data.total || 0);
      }
    } catch (error) {
      console.error('加载动态数量失败:', error);
    }
  };

  // 查看关注列表
  const handleViewFollowing = () => {
    Alert.alert('关注列表', `你关注了 ${followStats.followingCount} 个用户`);
    // 后续可以导航到关注列表页面
    // navigation.navigate('FollowingList');
  };

  // 查看粉丝列表
  const handleViewFollowers = () => {
    Alert.alert('粉丝列表', `你有 ${followStats.followersCount} 个粉丝`);
    // 后续可以导航到粉丝列表页面
    // navigation.navigate('FollowersList');
  };

  const menuItems = [
    { id: 0, title: '个人信息', icon: '👤', action: 'profile' },
    { id: 1, title: '隐私设置', icon: '🔒', action: 'privacy' },
    { id: 2, title: '账号安全', icon: '🛡️', action: 'settings' },
    { id: 3, title: '通知设置', icon: '🔔', action: 'notifications' },
    { id: 4, title: '用户反馈', icon: '💬', action: 'feedback' },
    { id: 5, title: '关于我们', icon: 'ℹ️', action: 'about' },
  ];

  const handleMenuPress = (action) => {
    switch (action) {
      case 'checkin':
        navigation.navigate('Checkin');
        break;
      case 'member':
        navigation.navigate('MemberCenter');
        break;
      case 'profile':
        Alert.alert('个人信息', '这里可以编辑个人资料、头像等信息');
        break;
      case 'settings':
        navigation.navigate('AccountSecurity');
        break;
      case 'privacy':
        navigation.navigate('PrivacySettings');
        break;
      case 'notifications':
        Alert.alert('通知设置', '这里可以设置消息通知、推送权限等');
        break;
      case 'feedback':
        navigation.navigate('Feedback');
        break;
      case 'about':
        Alert.alert('关于我们', '漂流瓶 v1.0.0\n\n一个连接心灵的海洋聊天应用');
        break;
      default:
        Alert.alert('提示', `点击了：${action}`);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      '退出登录',
      '确定要退出登录吗？',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            await logout();
            // 导航会自动处理（App.js 监听 isAuthenticated 变化）
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>👤 我的</Text>
      </View>

      {/* 个人信息卡片 - 精致设计 */}
      <View style={styles.profileCard}>
        <TouchableOpacity 
          style={styles.profileHeader}
          onPress={() => navigation.navigate('UserProfile', { userUuid: userInfo.uuid })}
          activeOpacity={0.8}
        >
          {/* 左侧头像 */}
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
            <View style={styles.avatarBadge}>
              <Text style={styles.avatarBadgeText}>✨</Text>
            </View>
          </View>
          
          {/* 中间信息 */}
          <View style={styles.userInfoSection}>
            <Text style={styles.userName}>{userInfo.name}</Text>
            <Text style={styles.userPhone}>ID: {userInfo.phone}</Text>
          </View>
          
          {/* 右侧按钮 */}
          <View style={styles.viewProfileButton}>
            <Text style={styles.viewProfileText}>查看个人主页</Text>
            <Text style={styles.arrowIcon}>›</Text>
          </View>
        </TouchableOpacity>
        
        {/* 统计数据卡片 */}
        <View style={styles.statsWrapper}>
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={handleViewFollowing}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{followStats.followingCount}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.statCard} 
            onPress={handleViewFollowers}
            activeOpacity={0.7}
          >
            <Text style={styles.statNumber}>{followStats.followersCount}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </TouchableOpacity>
          
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{momentCount}</Text>
            <Text style={styles.statLabel}>动态</Text>
          </View>
        </View>
      </View>

      {/* 会员中心卡片 - 醒目设计 */}
      <TouchableOpacity 
        style={styles.vipCard}
        onPress={() => navigation.navigate('MemberCenter')}
        activeOpacity={0.8}
      >
        <View style={styles.vipGradient}>
          <View style={styles.vipHeader}>
            <View style={styles.vipTitleRow}>
              <Text style={styles.vipIcon}>👑</Text>
              <View>
                <Text style={styles.vipTitle}>会员中心</Text>
                <Text style={styles.vipSubtitle}>专属特权等你解锁</Text>
              </View>
            </View>
            <View style={styles.vipBadge}>
              <Text style={styles.vipBadgeText}>VIP</Text>
            </View>
          </View>
          <View style={styles.vipFeatures}>
            <View style={styles.vipFeatureItem}>
              <Text style={styles.vipFeatureIcon}>⚡</Text>
              <Text style={styles.vipFeatureText}>无限次数</Text>
            </View>
            <View style={styles.vipFeatureItem}>
              <Text style={styles.vipFeatureIcon}>🎁</Text>
              <Text style={styles.vipFeatureText}>专属礼包</Text>
            </View>
            <View style={styles.vipFeatureItem}>
              <Text style={styles.vipFeatureIcon}>🌟</Text>
              <Text style={styles.vipFeatureText}>特殊标识</Text>
            </View>
          </View>
          <View style={styles.vipAction}>
            <Text style={styles.vipActionText}>立即开通 ›</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* 签到卡片 */}
      <TouchableOpacity 
        style={styles.checkinCard}
        onPress={() => navigation.navigate('Checkin')}
      >
        <View style={styles.checkinLeft}>
          <Text style={styles.checkinIcon}>📅</Text>
          <View style={styles.checkinInfo}>
            <Text style={styles.checkinTitle}>每日签到</Text>
            <Text style={styles.checkinSubtitle}>
              {pointsInfo.is_checked_in_today ? '今日已签到' : '点击签到领积分'}
            </Text>
          </View>
        </View>
        <View style={styles.checkinRight}>
          <Text style={styles.pointsValue}>{pointsInfo.points}</Text>
          <Text style={styles.pointsLabel}>积分</Text>
          {pointsInfo.continuous_days > 0 && (
            <Text style={styles.streakText}>连续{pointsInfo.continuous_days}天</Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.menuSection}>
        {menuItems.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handleMenuPress(item.action)}
          >
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuTitle}>{item.title}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionTitle}>账户信息</Text>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>邮箱</Text>
          <Text style={styles.infoValue}>{userInfo.email}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>注册时间</Text>
          <Text style={styles.infoValue}>{userInfo.joinDate}</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Text style={styles.logoutText}>退出登录</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#E3F2FD', // 淡蓝色背景
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 60,
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    color: '#1976D2', // 深蓝色文字
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: 'hidden',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: 16,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#E8F4FD',
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  avatarEmoji: {
    fontSize: 32,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  avatarBadgeText: {
    fontSize: 12,
  },
  userInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 6,
  },
  userPhone: {
    fontSize: 13,
    color: '#999',
    marginBottom: 10,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 8,
  },
  viewProfileText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '600',
    marginRight: 2,
  },
  arrowIcon: {
    fontSize: 18,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  statsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#FAFBFC',
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  menuSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 15,
    width: 30,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  menuArrow: {
    fontSize: 18,
    color: '#999',
  },
  infoSection: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    marginHorizontal: 15,
    marginBottom: 30,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // 签到卡片样式
  checkinCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  checkinLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkinIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  checkinInfo: {
    flex: 1,
  },
  checkinTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  checkinSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  checkinRight: {
    alignItems: 'flex-end',
  },
  pointsValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#999',
  },
  streakText: {
    fontSize: 11,
    color: '#f59e0b',
    marginTop: 4,
    fontWeight: '600',
  },
  // 会员中心卡片样式 - 醒目设计
  vipCard: {
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  vipGradient: {
    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
    backgroundColor: '#FFD700',
    padding: 20,
  },
  vipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  vipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vipIcon: {
    fontSize: 40,
    marginRight: 12,
  },
  vipTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  vipSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  vipBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF6B00',
  },
  vipBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  vipFeatures: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
  },
  vipFeatureItem: {
    alignItems: 'center',
  },
  vipFeatureIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  vipFeatureText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  vipAction: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  vipActionText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
});
