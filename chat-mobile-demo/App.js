import React, { useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Alert, ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

// 导入状态管理
import { useAuthStore, useSocketStore } from './stores';

// 导入页面组件
import HomeScreen from './HomeScreen';
import MessagesScreen from './MessagesScreen';
import ProfileScreen from './ProfileScreen';
import ChatDetailScreen from './ChatDetailScreen';
import LoginScreen from './LoginScreen';
import RegisterScreen from './RegisterScreen';
import VoiceCallScreen from './VoiceCallScreen';
import MomentsScreen from './MomentsScreen';
import PublishMomentScreen from './PublishMomentScreen';
import MomentDetailScreen from './MomentDetailScreen';
import UserProfileScreen from './UserProfileScreen';
import FollowListScreen from './FollowListScreen';
import EditProfileScreen from './EditProfileScreen';
import CheckinScreen from './CheckinScreen';
import PaymentScreen from './PaymentScreen';
import MemberCenterScreen from './MemberCenterScreen';
import PrivacySettingsScreen from './PrivacySettingsScreen';
import AccountSecurityScreen from './AccountSecurityScreen';
import AccountDeletionScreen from './AccountDeletionScreen';
import FeedbackScreen from './FeedbackScreen';
import PrivacyPolicyScreen from './PrivacyPolicyScreen';
import UserAgreementScreen from './UserAgreementScreen';
import AgeSelectionScreen from './AgeSelectionScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 消息页面的堆栈导航器
function MessagesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MessagesList" 
        component={MessagesScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// 主堆栈导航器
function MainStack() {
  // 从 store 获取用户信息用于导航
  const user = useAuthStore(state => state.user);
  
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        component={TabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="ChatDetail" 
        component={ChatDetailScreen}
        options={({ route, navigation }) => ({
          headerShown: true,
          title: route.params?.user?.name || route.params?.user?.username || '聊天',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '语音通话',
                  `确定要呼叫 ${route.params?.user?.name || route.params?.user?.username || '用户'} 吗？`,
                  [
                    { text: '取消', style: 'cancel' },
                    { 
                      text: '确定', 
                      onPress: () => navigation.navigate('VoiceCall', {
                        caller: {
                          id: user?.uuid || 'current_user_id',
                          name: user?.nickname || user?.username || '当前用户',
                          avatar: user?.avatar || '👤',
                        },
                        receiver: route.params?.user
                      })
                    }
                  ]
                );
              }}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: '#fff', fontSize: 16 }}>📞</Text>
            </TouchableOpacity>
          ),
        })}
      />
      <Stack.Screen name="VoiceCall" component={VoiceCallScreen} />
      <Stack.Screen name="PublishMoment" component={PublishMomentScreen} />
      <Stack.Screen name="MomentDetail" component={MomentDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="FollowList" component={FollowListScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Checkin" component={CheckinScreen} />
      <Stack.Screen 
        name="Payment" 
        component={PaymentScreen}
        options={{
          headerShown: true,
          title: '购买套餐',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <Stack.Screen 
        name="MemberCenter" 
        component={MemberCenterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PrivacySettings" 
        component={PrivacySettingsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="PrivacyPolicy" 
        component={PrivacyPolicyScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="UserAgreement" 
        component={UserAgreementScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AccountSecurity" 
        component={AccountSecurityScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="AccountDeletion" 
        component={AccountDeletionScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Feedback" 
        component={FeedbackScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// 底部标签导航器
function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? '🏠' : '🏡',
            Messages: focused ? '💬' : '💭',
            Moments: focused ? '⭐' : '✨',
            Profile: focused ? '👤' : '👥',
          };
          return <Text style={{ fontSize: size, color }}>{icons[route.name]}</Text>;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: route.name === 'Home' ? 'rgba(255, 255, 255, 0.7)' : 'gray',
        tabBarStyle: route.name === 'Home' ? {
          backgroundColor: 'transparent',
          borderTopWidth: 0,
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
          position: 'absolute',
          elevation: 0,
          shadowOpacity: 0,
        } : {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: route.name === 'Home' ? {
          fontSize: 12,
          fontWeight: '500',
          textShadowColor: 'rgba(0, 0, 0, 0.3)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 2,
        } : {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ tabBarLabel: '首页' }}
      />
      <Tab.Screen 
        name="Messages" 
        component={MessagesStack}
        options={{ tabBarLabel: '消息' }}
      />
      <Tab.Screen 
        name="Moments" 
        component={MomentsScreen}
        options={{ tabBarLabel: '动态' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ tabBarLabel: '我的' }}
      />
    </Tab.Navigator>
  );
}

// 认证堆栈导航器
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="AgeSelection" component={AgeSelectionScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="UserAgreement" component={UserAgreementScreen} />
    </Stack.Navigator>
  );
}

// 主应用组件
export default function App() {
  // 使用 Zustand 状态管理
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const initAuth = useAuthStore(state => state.initAuth);
  
  const socket = useSocketStore(state => state.socket);
  const connected = useSocketStore(state => state.connected);
  const connect = useSocketStore(state => state.connect);
  const disconnect = useSocketStore(state => state.disconnect);
  const on = useSocketStore(state => state.on);
  const off = useSocketStore(state => state.off);
  
  const navigationRef = useRef(null);

  // 初始化认证状态
  useEffect(() => {
    console.log('[App] 初始化应用...');
    initAuth();
  }, [initAuth]);

  // 管理 WebSocket 连接
  useEffect(() => {
    if (isAuthenticated && token && user) {
      console.log('[App] 用户已认证，连接 WebSocket');
      connect(token);
      
      // 等待 socket 连接后注册用户
      const registerUser = () => {
        if (socket && socket.connected) {
          console.log('[App] 注册用户到 WebSocket:', user.uuid);
          socket.emit('register', {
            uuid: user.uuid,
            phone: user.phone,
          });
        }
      };

      // 如果已连接，直接注册；否则等待连接事件
      if (socket) {
        if (socket.connected) {
          registerUser();
        } else {
          socket.on('connect', registerUser);
        }
      }
    } else {
      console.log('[App] 用户未认证，断开 WebSocket');
      disconnect();
    }
    
    // 组件卸载时断开连接
    return () => {
      if (socket) {
        socket.off('connect', () => {});
      }
    };
  }, [isAuthenticated, token, user, connect, disconnect, socket]);

  // 处理 WebSocket 消息监听
  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    console.log('[App] 设置 WebSocket 消息监听器');

    // 处理新消息（子组件会监听）
    const handleNewMessage = (data) => {
      console.log('[App] 收到新消息:', data);
    };

    // 处理语音消息
    const handleVoiceMessage = (data) => {
      console.log('[App] 收到语音消息:', data);
    };

    // 处理图片消息
    const handleImageMessage = (data) => {
      console.log('[App] 收到图片消息:', data);
    };

    // 处理来电
    const handleCallOffer = (data) => {
      console.log('[App] 收到来电:', data);
      
      // 导航到通话界面
      if (navigationRef.current && user) {
        navigationRef.current.navigate('MainTabs', {
          screen: 'Messages',
          params: {
            screen: 'VoiceCall',
            params: {
              caller: data.caller || { id: data.from, name: '对方', avatar: '👤' },
              callee: { 
                id: user.uuid, 
                name: user.nickname || user.username, 
                avatar: user.avatar || '👤' 
              },
              isIncoming: true,
              offer: data.offer,
            }
          }
        });
      }
    };

    // 注册监听器
    on('new_message', handleNewMessage);
    on('voice_message', handleVoiceMessage);
    on('image_message', handleImageMessage);
    on('call_offer', handleCallOffer);

    // 清理监听器
    return () => {
      off('new_message', handleNewMessage);
      off('voice_message', handleVoiceMessage);
      off('image_message', handleImageMessage);
      off('call_offer', handleCallOffer);
    };
  }, [socket, connected, on, off, user]);

  // 显示加载状态
  if (isLoading) {
    return (
      <NavigationContainer>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={{ marginTop: 10, color: '#666' }}>加载中...</Text>
        </View>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

