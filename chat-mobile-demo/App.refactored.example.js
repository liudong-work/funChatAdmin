/**
 * 重构后的 App.js 示例
 * 
 * 使用 Zustand 状态管理替代原有的 useState 和 prop drilling
 * 
 * 主要改进：
 * 1. 使用 useAuthStore 管理认证状态
 * 2. 使用 useSocketStore 管理 WebSocket 连接
 * 3. 移除不必要的 prop 传递
 * 4. 简化状态管理逻辑
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Text, TouchableOpacity, Alert } from 'react-native';

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

// ========== 消息堆栈导航 ==========
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

// ========== 主堆栈导航 ==========
function MainStack() {
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
          title: route.params?.user?.name || '聊天',
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '语音通话',
                  `确定要呼叫 ${route.params?.user?.name || '用户'} 吗？`,
                  [
                    { text: '取消', style: 'cancel' },
                    { 
                      text: '确定', 
                      onPress: () => navigation.navigate('VoiceCall', {
                        caller: { id: 'current_user_id', name: '当前用户', avatar: '👤' },
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
      <Stack.Screen name="Payment" component={PaymentScreen} />
      <Stack.Screen name="MemberCenter" component={MemberCenterScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacySettings" component={PrivacySettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
      <Stack.Screen name="UserAgreement" component={UserAgreementScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccountSecurity" component={AccountSecurityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="AccountDeletion" component={AccountDeletionScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Feedback" component={FeedbackScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

// ========== 底部标签导航 ==========
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
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: '首页' }} />
      <Tab.Screen name="Messages" component={MessagesStack} options={{ tabBarLabel: '消息' }} />
      <Tab.Screen name="Moments" component={MomentsScreen} options={{ tabBarLabel: '动态' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: '我的' }} />
    </Tab.Navigator>
  );
}

// ========== 认证堆栈导航 ==========
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

// ========== 主应用组件 ==========
export default function App() {
  // 使用 Zustand 状态管理
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const isLoading = useAuthStore(state => state.isLoading);
  const initAuth = useAuthStore(state => state.initAuth);
  const token = useAuthStore(state => state.token);
  
  const connect = useSocketStore(state => state.connect);
  const disconnect = useSocketStore(state => state.disconnect);
  
  // 初始化认证状态
  useEffect(() => {
    console.log('[App] 初始化应用...');
    initAuth();
  }, [initAuth]);
  
  // 管理 WebSocket 连接
  useEffect(() => {
    if (isAuthenticated && token) {
      console.log('[App] 用户已认证，连接 WebSocket');
      connect(token);
    } else {
      console.log('[App] 用户未认证，断开 WebSocket');
      disconnect();
    }
    
    // 组件卸载时断开连接
    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);
  
  // 加载中状态
  if (isLoading) {
    return null; // 或者返回一个加载动画
  }
  
  // 渲染应用
  return (
    <NavigationContainer>
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

/**
 * 对比原有代码的改进：
 * 
 * 1. 移除了大量 useState：
 *    - const [isAuthenticated, setIsAuthenticated] = useState(false);
 *    - const [socket, setSocket] = useState(null);
 *    - const [currentUserUuid, setCurrentUserUuid] = useState(null);
 *    等等...
 * 
 * 2. 移除了复杂的 useEffect 逻辑：
 *    - 不再需要手动从 AsyncStorage 读取
 *    - 不再需要手动管理 WebSocket 连接
 *    - 所有逻辑都封装在 stores 中
 * 
 * 3. 移除了 prop drilling：
 *    - 不再需要通过 props 传递 onNewMessageCallback
 *    - 不再需要传递 handleLogout
 *    - 子组件可以直接从 store 获取需要的状态和方法
 * 
 * 4. 代码更清晰：
 *    - App.js 从 671 行减少到约 200 行
 *    - 关注点分离：UI 逻辑和状态管理分离
 *    - 更容易测试和维护
 */

