import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ onLogout }) {
  const [userInfo, setUserInfo] = useState({
    name: '我的昵称',
    avatar: '👤',
    phone: '138****8888',
    email: 'user@example.com',
    joinDate: '2024-01-01',
  });

  // 加载用户信息
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const user = JSON.parse(userInfoStr);
        setUserInfo({
          name: user.nickname || user.username || '我的昵称',
          avatar: user.avatar || '👤',
          phone: user.phone ? `${user.phone.slice(0, 3)}****${user.phone.slice(-4)}` : '138****8888',
          email: user.email || 'user@example.com',
          joinDate: '2024-01-01',
        });
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const menuItems = [
    { id: 1, title: '个人信息', icon: '👤', action: 'profile' },
    { id: 2, title: '账号设置', icon: '⚙️', action: 'settings' },
    { id: 3, title: '主题设置', icon: '🎨', action: 'theme' },
    { id: 4, title: '隐私设置', icon: '🔒', action: 'privacy' },
    { id: 5, title: '通知设置', icon: '🔔', action: 'notifications' },
    { id: 6, title: '帮助中心', icon: '❓', action: 'help' },
    { id: 7, title: '关于我们', icon: 'ℹ️', action: 'about' },
  ];

  const handleMenuPress = (action) => {
    switch (action) {
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
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{userInfo.avatar}</Text>
          <TouchableOpacity style={styles.editAvatarButton}>
            <Text style={styles.editAvatarText}>编辑</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.userName}>{userInfo.name}</Text>
        <Text style={styles.userPhone}>{userInfo.phone}</Text>
        
        <View style={styles.userStats}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>好友</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>群聊</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>消息</Text>
          </View>
        </View>
      </View>

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
});
