import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi, pointsApi } from './services/apiService';

export default function ProfileScreen({ onLogout, navigation }) {
  const [userInfo, setUserInfo] = useState({
    name: '我的昵称',
    avatar: '👤',
    phone: '138****8888',
    email: 'user@example.com',
    joinDate: '2024-01-01',
    uuid: '',
  });
  
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

  // 加载用户信息
  useEffect(() => {
    loadUserInfo();
    loadFollowStats();
    loadPointsInfo();
  }, []);

  // 监听页面焦点，从编辑资料页面返回时刷新数据
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // 页面获得焦点时重新加载用户信息
      loadUserInfo();
      loadPointsInfo();
    });

    return unsubscribe;
  }, [navigation]);

  // 当用户uuid加载完成后，加载动态数量
  useEffect(() => {
    if (userInfo.uuid) {
      loadMomentCount();
    }
  }, [userInfo.uuid]);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const user = JSON.parse(userInfoStr);
        const userData = {
          name: user.nickname || user.username || '我的昵称',
          avatar: user.avatar || '👤',
          phone: user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '138****8888',
          email: user.email || 'user@example.com',
          joinDate: '2024-01-01',
          uuid: user.uuid || '',
        };
        setUserInfo(userData);
        
        // 如果用户uuid存在，立即加载动态数量
        if (userData.uuid) {
          loadMomentCount(userData.uuid);
        }
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  // 加载积分信息
  const loadPointsInfo = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
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
      const token = await AsyncStorage.getItem('authToken');
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
      const token = await AsyncStorage.getItem('authToken');
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
    { id: 0, title: '每日签到', icon: '📅', action: 'checkin' },
    { id: 1, title: '会员中心', icon: '👑', action: 'member' },
    { id: 2, title: '个人信息', icon: '👤', action: 'profile' },
    { id: 3, title: '账号设置', icon: '⚙️', action: 'settings' },
    { id: 4, title: '主题设置', icon: '🎨', action: 'theme' },
    { id: 5, title: '隐私设置', icon: '🔒', action: 'privacy' },
    { id: 6, title: '通知设置', icon: '🔔', action: 'notifications' },
    { id: 7, title: '帮助中心', icon: '❓', action: 'help' },
    { id: 8, title: '关于我们', icon: 'ℹ️', action: 'about' },
  ];

  const handleMenuPress = (action) => {
    switch (action) {
      case 'checkin':
        navigation.navigate('Checkin');
        break;
      case 'member':
        navigation.navigate('MemberCenter');
        break;
      case 'theme':
        Alert.alert(
          '主题设置',
          '选择你喜欢的主题风格：',
          [
            { text: '海洋蓝', onPress: () => Alert.alert('提示', '已切换到海洋蓝主题') },
            { text: '深色模式', onPress: () => Alert.alert('提示', '已切换到深色模式') },
            { text: '浅色模式', onPress: () => Alert.alert('提示', '已切换到浅色模式') },
            { text: '取消', style: 'cancel' }
          ]
        );
        break;
      case 'profile':
        Alert.alert('个人信息', '这里可以编辑个人资料、头像等信息');
        break;
      case 'settings':
        Alert.alert('账号设置', '这里可以修改密码、绑定手机号等');
        break;
      case 'privacy':
        Alert.alert('隐私设置', '这里可以设置隐私权限、黑名单等');
        break;
      case 'notifications':
        Alert.alert('通知设置', '这里可以设置消息通知、推送权限等');
        break;
      case 'help':
        Alert.alert('帮助中心', '这里可以查看常见问题、联系客服等');
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
          onPress: () => {
            if (onLogout) {
              onLogout();
            }
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

      <View style={styles.profileCard}>
        <TouchableOpacity 
          style={styles.avatarContainer}
          onPress={() => navigation.navigate('UserProfile', { userUuid: userInfo.uuid })}
        >
          {userInfo.avatar && userInfo.avatar.startsWith('http') ? (
            <Image 
              source={{ uri: userInfo.avatar }} 
              style={styles.avatarImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatar}>{userInfo.avatar || '👤'}</Text>
          )}
          <View style={styles.editAvatarButton}>
            <Text style={styles.editAvatarText}>查看</Text>
          </View>
        </TouchableOpacity>
        
        <Text style={styles.userName}>{userInfo.name}</Text>
        <Text style={styles.userPhone}>{userInfo.phone}</Text>
        
        <View style={styles.userStats}>
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowing}>
            <Text style={styles.statNumber}>{followStats.followingCount}</Text>
            <Text style={styles.statLabel}>关注</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.statItem} onPress={handleViewFollowers}>
            <Text style={styles.statNumber}>{followStats.followersCount}</Text>
            <Text style={styles.statLabel}>粉丝</Text>
          </TouchableOpacity>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{momentCount}</Text>
            <Text style={styles.statLabel}>动态</Text>
          </View>
        </View>
      </View>

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
  profileCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  avatar: {
    fontSize: 60,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 80,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editAvatarText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  userStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
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
});
