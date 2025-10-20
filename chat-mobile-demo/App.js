import React, { useState, useEffect, useRef } from 'react';
import { Text, TouchableOpacity, Alert } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import io from 'socket.io-client';
import { getWebSocketUrl } from './config/api.js';
// import notificationService from './services/notificationService.js'; // 暂时禁用，Expo Go 不支持推送

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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// 消息页面的堆栈导航器
function MessagesStack({ onNewMessageCallback, onRegisterChatMessageCallback, onSetCurrentChatUser, currentUserUuid }) {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MessagesList" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <MessagesScreen {...props} onNewMessageCallback={onNewMessageCallback} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// 底部标签导航器
// 主堆栈导航器
function MainStack({ onNewMessageCallback, handleLogout, onRegisterChatMessageCallback, onSetCurrentChatUser, currentUserUuid }) {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="MainTabs" 
        options={{ headerShown: false }}
      >
        {(props) => (
          <TabNavigator 
            {...props}
            onNewMessageCallback={onNewMessageCallback} 
            handleLogout={handleLogout}
            onRegisterChatMessageCallback={onRegisterChatMessageCallback}
            onSetCurrentChatUser={onSetCurrentChatUser}
            currentUserUuid={currentUserUuid}
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="ChatDetail" 
        options={({ route, navigation }) => ({
          headerShown: true,
          title: route.params?.user?.name || route.params?.user?.username || '聊天',
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          headerRight: () => (
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  '语音通话',
                  `确定要呼叫 ${route.params?.user?.name || route.params?.user?.username || '用户'} 吗？`,
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '确定', onPress: () => {
                      navigation.navigate('VoiceCall', {
                        caller: {
                          id: 'current_user_id', // 这里需要从全局状态获取
                          name: '当前用户',
                          avatar: '👤',
                        },
                        callee: {
                          id: route.params?.user?.id,
                          name: route.params?.user?.name || route.params?.user?.username,
                          avatar: route.params?.user?.avatar || '👤',
                        },
                      });
                    }}
                  ]
                );
              }}
              style={{ marginRight: 15 }}
            >
              <Text style={{ color: '#fff', fontSize: 18 }}>📞</Text>
            </TouchableOpacity>
          ),
        })}
      >
        {(props) => (
          <ChatDetailScreen
            {...props}
            onRegisterChatMessageCallback={onRegisterChatMessageCallback}
            onSetCurrentChatUser={onSetCurrentChatUser}
            currentUserUuid={currentUserUuid}
          />
        )}
      </Stack.Screen>
      <Stack.Screen 
        name="VoiceCall" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <VoiceCallScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="PublishMoment" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <PublishMomentScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="MomentDetail" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <MomentDetailScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="UserProfile" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <UserProfileScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="FollowList" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <FollowListScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="EditProfile" 
        options={{
          headerShown: false,
        }}
      >
        {(props) => <EditProfileScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Checkin" 
        options={{
          headerShown: true,
          title: '每日签到',
          headerStyle: {
            backgroundColor: '#3b82f6',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {(props) => <CheckinScreen {...props} />}
      </Stack.Screen>
      <Stack.Screen 
        name="Payment" 
        options={{
          headerShown: true,
          title: '微信支付',
          headerStyle: {
            backgroundColor: '#07C160',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {(props) => <PaymentScreen {...props} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function TabNavigator({ onNewMessageCallback, handleLogout, onRegisterChatMessageCallback, onSetCurrentChatUser, currentUserUuid }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Home') {
            iconName = focused ? '🏠' : '🏡';
          } else if (route.name === 'Messages') {
            iconName = focused ? '💬' : '💭';
          } else if (route.name === 'Moments') {
            iconName = focused ? '⭐' : '✨';
          } else if (route.name === 'Profile') {
            iconName = focused ? '👤' : '👥';
          }

          return <Text style={{ fontSize: size, color }}>{iconName}</Text>;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: 'white',
          borderTopWidth: 1,
          borderTopColor: '#E5E5EA',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarLabel: '首页',
        }}
      />
      <Tab.Screen 
        name="Messages" 
        options={{
          tabBarLabel: '消息',
        }}
      >
        {(props) => (
          <MessagesStack
            {...props}
            onNewMessageCallback={onNewMessageCallback}
            onRegisterChatMessageCallback={onRegisterChatMessageCallback}
            onSetCurrentChatUser={onSetCurrentChatUser}
            currentUserUuid={currentUserUuid}
          />
        )}
      </Tab.Screen>
      <Tab.Screen 
        name="Moments" 
        component={MomentsScreen}
        options={{
          tabBarLabel: '动态',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        options={{
          tabBarLabel: '我的',
        }}
      >
        {(props) => <ProfileScreen {...props} onLogout={handleLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

// 认证堆栈导航器
function AuthStack({ setIsAuthenticated }) {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login">
        {(props) => <LoginScreen {...props} setIsAuthenticated={setIsAuthenticated} />}
      </Stack.Screen>
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const [newMessageCallback, setNewMessageCallback] = useState(null);
  const chatMessageHandlerRef = useRef(null);
  const [currentChatUserId, setCurrentChatUserId] = useState(null);
  const [currentUserUuid, setCurrentUserUuid] = useState(null);
  const navigationRef = useRef(null);

  // 检查用户登录状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (token && userInfo) {
        // 验证token是否有效（这里可以添加token验证逻辑）
        setIsAuthenticated(true);
        try {
          const user = JSON.parse(userInfo);
          setCurrentUserUuid(user.uuid);
        } catch {}
        // 连接WebSocket
        connectWebSocket(userInfo);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 处理新消息
  const handleNewMessage = (data) => {
    console.log('处理新消息:', data);
    if (data && data.message) {
      const original = data.message;
      // 处理消息数据
      const processed = {
        ...original,
        content: original?.content || '',
      };
      
      // 消息列表预览更新
      if (newMessageCallback) {
        // 确保必要字段存在
        if (!processed.sender_uuid) {
        console.warn('handleNewMessage: message.sender_uuid is missing');
        } else {
          // 处理图片消息的特殊显示
          let displayContent = processed.content || '新消息';
          let messageType = 'text';
          let imageUrl = null;
          
          if (processed.type === 'image' || processed.message_type === 'image') {
            messageType = 'image';
            imageUrl = processed.imageUrl || processed.file_url;
            displayContent = '📷 阅后即焚图片';
          }
          
          newMessageCallback(
            processed.sender_uuid,
            `用户${processed.sender_uuid.slice(-4)}`,
            displayContent,
            messageType,
            imageUrl
          );
        }
      }
    
    // 推送到聊天详情页（如果已注册）
    const handler = chatMessageHandlerRef.current;
    if (typeof handler === 'function') {
      console.log('[Chat] 推送到聊天详情页，callback 可用');
      try { handler(processed); } catch (e) { console.warn('[Chat] 调用聊天详情回调报错', e); }
    } else {
      console.log('[Chat] 聊天详情未注册回调或不是函数:', typeof handler);
    }
    }
  };

  // 初始化推送通知（暂时禁用，Expo Go 不支持）
  const initializePushNotifications = async (user) => {
    console.log('[推送] 推送通知已禁用 - Expo Go 不支持推送通知');
    console.log('[推送] 请使用 EAS Development Build 来测试推送功能');
    // 推送通知功能暂时禁用，因为 Expo Go 在 SDK 53 中移除了推送支持
  };

  const connectWebSocket = async (userInfo) => {
    try {
      const user = JSON.parse(userInfo);
      const socketInstance = io(getWebSocketUrl(), {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000,
      });
      
      // 初始化推送通知
      await initializePushNotifications(user);
      
      socketInstance.on('connect', () => {
        console.log('WebSocket连接成功');
        // 注册用户到WebSocket
        socketInstance.emit('register', {
          uuid: user.uuid,
          phone: user.phone,
        });
      });

      socketInstance.on('new_message', (data) => {
        console.log('收到新消息:', JSON.stringify(data));
        // 全局消息处理逻辑
        handleNewMessage(data);
      });

      // 处理语音消息
      socketInstance.on('voice_message', (data) => {
        console.log('[WS] 收到语音消息:', {
          sender: data.message?.sender_uuid,
          receiver: data.message?.receiver_uuid,
          duration: data.message?.duration,
          audioDataLength: data.message?.audioData ? data.message.audioData.length : 0
        });
        
        // 将语音消息转换为普通消息格式进行处理
        const voiceMessageData = {
          message: {
            ...data.message,
            content: '[语音消息]', // 统一显示为语音消息
            type: 'voice'
          },
          conversation_key: data.conversation_key
        };
        
        handleNewMessage(voiceMessageData);
      });

      // 处理图片消息
      socketInstance.on('image_message', (data) => {
        console.log('[WS] 收到图片消息:', {
          sender: data.message?.sender_uuid,
          receiver: data.message?.receiver_uuid,
          imageUrl: data.message?.imageUrl,
          width: data.message?.width,
          height: data.message?.height
        });
        
        // 将图片消息转换为普通消息格式进行处理
        const imageMessageData = {
          message: {
            ...data.message,
            content: '[图片消息]', // 统一显示为图片消息
            type: 'image'
          },
          conversation_key: data.conversation_key
        };
        
        handleNewMessage(imageMessageData);
      });

      // 处理图片发送确认
      socketInstance.on('image_message_sent', (data) => {
        console.log('[WS] 图片消息发送成功确认:', {
          messageId: data.messageId,
          imageUrl: data.imageUrl,
          status: data.status
        });
      });

      // ==================== WebRTC 语音通话监听 ====================
      
      // 处理来电
      socketInstance.on('call_offer', (data) => {
        console.log('[WebRTC] 收到来电:', {
          from: data.from,
          caller: data.caller
        });
        
        // 导航到通话界面（来电状态）
        if (navigationRef.current) {
          navigationRef.current.navigate('Messages', {
            screen: 'VoiceCall',
            params: {
              caller: data.caller || { id: data.from, name: '对方', avatar: '👤' },
              callee: { id: user.uuid, name: user.nickname || user.username, avatar: user.avatar || '👤' },
              isIncoming: true,
              offer: data.offer, // 保存 Offer 用于接听时处理
            }
          });
        }
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('WebSocket连接断开:', reason);
      });

      socketInstance.on('reconnect', (attemptNumber) => {
        console.log('WebSocket重连成功，尝试次数:', attemptNumber);
        // 重连后重新注册用户
        socketInstance.emit('register', {
          uuid: user.uuid,
          phone: user.phone,
        });
      });

      socketInstance.on('reconnect_error', (error) => {
        console.error('WebSocket重连失败:', error);
      });

      // 响应心跳检测
      socketInstance.on('ping', () => {
        socketInstance.emit('pong');
      });

      socketInstance.on('heartbeat_ack', () => {
        // 心跳确认
      });

      setSocket(socketInstance);
      // 将 socket 存储到全局变量，供其他组件使用
      global.socket = socketInstance;
    } catch (error) {
      console.error('WebSocket连接失败:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // 推送通知功能已禁用
      // notificationService.removeListeners();
      // await notificationService.clearBadge();
      
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userInfo');
      setIsAuthenticated(false);
    } catch (error) {
      console.error('退出登录失败:', error);
    }
  };

  // 推送通知监听器已禁用
  // useEffect(() => {
  //   if (isAuthenticated && navigationRef.current) {
  //     notificationService.setupNotificationListeners(navigationRef.current);
  //     
  //     return () => {
  //       notificationService.removeListeners();
  //     };
  //   }
  // }, [isAuthenticated]);

  // 显示加载状态
  if (isLoading) {
    return (
      <NavigationContainer>
        <Text style={{ textAlign: 'center', marginTop: 100 }}>加载中...</Text>
      </NavigationContainer>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isAuthenticated ? (
        <MainStack 
          onNewMessageCallback={setNewMessageCallback} 
          handleLogout={handleLogout}
          onRegisterChatMessageCallback={(cb) => { chatMessageHandlerRef.current = cb; }}
          onSetCurrentChatUser={setCurrentChatUserId}
          currentUserUuid={currentUserUuid}
        />
      ) : (
        <AuthStack setIsAuthenticated={setIsAuthenticated} />
      )}
    </NavigationContainer>
  );
}