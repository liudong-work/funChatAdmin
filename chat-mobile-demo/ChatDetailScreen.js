import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Dimensions, ScrollView, StatusBar, Alert, Image, Modal, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { messageApi, fileApi } from "./services/apiService";
import * as FileSystem from 'expo-file-system/legacy';
import { getBaseUrl } from './config/api.js';

export default function ChatDetailScreen({ route, navigation, onRegisterChatMessageCallback, onSetCurrentChatUser, currentUserUuid }) {
  const { user } = route.params;
  
  console.log('[ChatDetail] 组件加载，接收到的user参数:', {
    id: user?.id,
    name: user?.name,
    sender_uuid: user?.sender_uuid,
    bottleMessage: user?.bottleMessage,
    hasBottleMessage: !!user?.bottleMessage
  });
  
  // 辅助函数：处理图片 URL
  const getImageUrl = (url) => {
    if (!url) {
      console.log('[Image] URL为空，返回null');
      return null;
    }
    
    // 如果是完整 URL 或本地文件路径，直接返回
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('file://')) {
      console.log('[Image] 完整URL，直接使用:', url);
      return url;
    }
    
    // 如果是相对路径，添加服务器地址
    const baseUrl = getBaseUrl();
    const fullUrl = `${baseUrl}${url}`;
    console.log('[Image] URL转换:', {
      original: url,
      baseUrl: baseUrl,
      fullUrl: fullUrl
    });
    return fullUrl;
  };

  // 加载已查看的图片状态
  const loadViewedImages = async () => {
    try {
      const stored = await AsyncStorage.getItem(VIEWED_IMAGES_KEY);
      if (stored) {
        const viewedArray = JSON.parse(stored);
        const viewedSet = new Set(viewedArray);
        setViewedImages(viewedSet);
        console.log('[Image] 加载已查看图片状态:', viewedArray);
      }
    } catch (error) {
      console.error('[Image] 加载已查看图片状态失败:', error);
    }
  };

  // 加载当前用户头像
  const loadCurrentUserAvatar = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const currentUser = JSON.parse(userInfo);
        const avatar = currentUser.avatar || '👤';
        setCurrentUserAvatar(avatar);
        console.log('[ChatDetail] 加载当前用户头像:', avatar);
      }
    } catch (error) {
      console.error('[ChatDetail] 加载当前用户头像失败:', error);
    }
  };

  // 保存已查看的图片状态
  const saveViewedImages = async (viewedSet) => {
    try {
      const viewedArray = Array.from(viewedSet);
      await AsyncStorage.setItem(VIEWED_IMAGES_KEY, JSON.stringify(viewedArray));
      console.log('[Image] 保存已查看图片状态:', viewedArray);
    } catch (error) {
      console.error('[Image] 保存已查看图片状态失败:', error);
    }
  };
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  
  // 图片预览状态
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [burnTimer, setBurnTimer] = useState(null); // 阅后即焚定时器
  const [viewedImages, setViewedImages] = useState(new Set()); // 跟踪已查看的图片
  const [currentUserAvatar, setCurrentUserAvatar] = useState('👤'); // 当前用户头像
  
  // AsyncStorage 键名
  const VIEWED_IMAGES_KEY = `viewed_images_${currentUserUuid}_${user.id}`;
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);
  
  // 语音输入模式状态
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
  // 分页加载相关状态
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(20); // 每页加载20条消息
  
  // 语音播放状态管理
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const [playingProgress, setPlayingProgress] = useState(0);

  // 选择图片并通过 WebSocket 发送
  const pickAndSendImage = async () => {
    try {
      console.log('[Image] 开始选择图片...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('[Image] 相册权限状态:', status);
      
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能发送图片');
        return;
      }
      
      console.log('[Image] 启动图片选择器...');
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5, // 降低质量到 50%
        allowsEditing: false,
        // 限制图片尺寸
        maxWidth: 1024,
        maxHeight: 1024,
      });
      
      console.log('[Image] 图片选择结果:', { canceled: res.canceled, assetsCount: res.assets?.length });
      
      if (res.canceled) {
        console.log('[Image] 用户取消选择图片');
        return;
      }
      
      const asset = res.assets && res.assets[0];
      if (!asset) {
        console.log('[Image] 未获取到图片资源');
        return;
      }

      console.log('[Image] 选中的图片:', {
        uri: asset.uri,
        width: asset.width,
        height: asset.height,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize
      });

      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) {
        console.error('[Image] 未找到用户信息');
        Alert.alert('提示', '请先登录');
        return;
      }
      
      const currentUser = JSON.parse(userInfo);
      const receiverId = user.sender_uuid || user.id;
      
      console.log('[Image] 用户信息:', {
        from: currentUserUuid,
        to: receiverId
      });

      console.log('[Image] 开始读取图片文件...');
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      console.log('[Image] 图片数据长度:', bytes.length);
      
      const socket = global.socket;
      if (!socket || !socket.connected) {
        console.error('[Image] WebSocket 未连接，状态:', socket ? socket.connected : 'socket不存在');
        Alert.alert('提示', '网络连接异常，请稍后重试');
        return;
      }
      
      console.log('[Image] 通过 WebSocket 发送图片消息...');
      console.log('[Image] Socket状态:', {
        connected: socket.connected,
        id: socket.id
      });
      
      socket.emit('image_message', {
        from: currentUserUuid,
        to: receiverId,
        imageData: Array.from(bytes),
        mimeType: asset.mimeType || 'image/jpeg',
        width: asset.width,
        height: asset.height,
      });
      
      console.log('[Image] 图片消息已发送，数据大小:', bytes.length, '字节');

      // 本地先插入一条图片消息（使用本地URI预览）
      setMessages(prev => {
        const newMessage = {
          id: Date.now(),
          text: '',
          type: 'image',
          imageUrl: asset.uri,
          width: asset.width,
          height: asset.height,
          timestamp: new Date(),
          user: { id: currentUserUuid, name: '我', avatar: currentUserAvatar },
        };
        console.log('[Image] 添加本地图片消息:', {
          messageId: newMessage.id,
          userId: newMessage.user.id,
          currentUserUuid: currentUserUuid,
          shouldBeOnRight: newMessage.user.id === currentUserUuid
        });
        return [...prev, newMessage];
      });
      
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('[Image] 选择/发送图片失败:', e);
      console.error('[Image] 错误详情:', e.message, e.stack);
      Alert.alert('提示', '发送图片失败: ' + e.message);
    }
  };
  
  // 加载对话历史
  useEffect(() => {
    const loadAll = async () => {
      // 先获取用户信息中的头像
      let userAvatar = '👤';
      try {
        const userInfo = await AsyncStorage.getItem('userInfo');
        if (userInfo) {
          const currentUser = JSON.parse(userInfo);
          userAvatar = currentUser.avatar || '👤';
        }
      } catch (error) {
        console.error('[ChatDetail] 获取头像失败:', error);
      }
      
      await loadCurrentUserAvatar(); // 加载当前用户头像到状态
      await loadViewedImages(); // 加载已查看的图片状态
      await loadConversationHistory(userAvatar, 0, false); // 首次加载，只加载最新20条
      
      // 确保消息加载完成后滚动到底部
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: false });
        }
      }, 300);
    };
    loadAll();
  }, []);

  // 注册当前会话的实时消息回调
  useEffect(() => {
    const otherUserId = user.sender_uuid || user.id;
    if (onSetCurrentChatUser) {
      onSetCurrentChatUser(otherUserId);
    }
    if (onRegisterChatMessageCallback) {
      console.log('[ChatDetail] 注册聊天详情消息回调, otherUserId=', otherUserId);
      // 现在父组件使用 useRef 保存回调，可直接传真实回调
      onRegisterChatMessageCallback((wsMessage) => {
        console.log('[ChatDetail] 收到回调消息:', {
          content: wsMessage?.content,
          sender: wsMessage?.sender_uuid,
          receiver: wsMessage?.receiver_uuid,
          type: wsMessage?.type,
          created_at: wsMessage?.created_at,
        });
        if (!wsMessage) return;
        // 守护：字段缺失直接忽略
        const safeId = (wsMessage && (wsMessage.uuid || wsMessage.id)) || Date.now();
        // 对于图片消息，不显示content作为文本
        const safeText = (wsMessage && wsMessage.content && !wsMessage.imageUrl) ? wsMessage.content : '';
        const safeTime = new Date((wsMessage && wsMessage.created_at) || Date.now());

        // 判断是谁发的，自己发的也要即时插入（避免等待轮询）
        const isMine = wsMessage && currentUserUuid && wsMessage.sender_uuid === currentUserUuid;

        // 将WS消息转为本地消息结构并插入
        setMessages((prev) => {
          const next = [
            ...prev,
            {
              id: safeId,
              text: safeText,
              timestamp: safeTime,
              // 语音消息相关字段
              audioData: wsMessage?.audioData || null,
              audioUrl: wsMessage?.audioUrl || null,
              duration: wsMessage?.duration || null,
              // 图片消息相关字段
              imageUrl: wsMessage?.imageUrl || null,
              width: wsMessage?.width || null,
              height: wsMessage?.height || null,
              type: wsMessage?.type || 'text',
              user: {
                id: isMine ? currentUserUuid : otherUserId,
                name: isMine ? '我' : (user.name || '对方'),
                avatar: isMine ? '👤' : (user.avatar || '👤'),
              },
            },
          ];
          console.log('[ChatDetail] 已插入一条消息，当前总数:', next.length);
          return next;
        });
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      });
    }
    return () => {
      if (onSetCurrentChatUser) onSetCurrentChatUser(null);
      if (onRegisterChatMessageCallback) {
        console.log('[ChatDetail] 取消注册聊天详情消息回调');
        onRegisterChatMessageCallback(null);
      }
    };
  }, [onRegisterChatMessageCallback, onSetCurrentChatUser, user]);

  // 图片预览功能（阅后即焚版本）
  const showImagePreview = (imageUrl) => {
    console.log('[Image] 显示图片预览（阅后即焚）:', {
      originalUrl: imageUrl,
      processedUrl: getImageUrl(imageUrl),
      urlType: typeof imageUrl,
      urlValid: !!imageUrl
    });
    
    // 检查URL有效性
    if (!imageUrl) {
      console.error('[Image] 图片URL为空，无法预览');
      return;
    }
    
    // 清除之前的定时器
    if (burnTimer) {
      clearTimeout(burnTimer);
    }
    
    const processedUrl = getImageUrl(imageUrl);
    setPreviewImageUrl(processedUrl);
    setImagePreviewVisible(true);
    
    // 记录已查看的图片（使用原始URL作为标识）
    setViewedImages(prev => {
      const newSet = new Set([...prev, imageUrl]);
      saveViewedImages(newSet); // 保存到AsyncStorage
      return newSet;
    });
    console.log('[Image] 图片已标记为已查看:', imageUrl);
    
    // 设置3秒后自动关闭
    const timer = setTimeout(() => {
      console.log('[Image] 阅后即焚：3秒后自动关闭图片');
      setImagePreviewVisible(false);
      setBurnTimer(null);
    }, 3000);
    
    setBurnTimer(timer);
    console.log('[Image] 阅后即焚定时器已设置（3秒）');
  };
  
  // 手动关闭图片预览
  const closeImagePreview = () => {
    console.log('[Image] 手动关闭图片预览');
    if (burnTimer) {
      clearTimeout(burnTimer);
      setBurnTimer(null);
    }
    setImagePreviewVisible(false);
  };

  const hideImagePreview = () => {
    setImagePreviewVisible(false);
    setPreviewImageUrl('');
  };

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (burnTimer) {
        clearTimeout(burnTimer);
      }
    };
  }, [burnTimer]);

  const loadConversationHistory = async (userAvatar = null, page = 0, isLoadMore = false) => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (!token || !userInfo) {
        console.warn('未找到认证信息，无法加载对话历史');
        setIsLoading(false);
        return;
      }

      const currentUser = JSON.parse(userInfo);
      const otherUserId = user.sender_uuid || user.id;
      
      // 调用后端接口获取对话历史（分页）
      console.log('[ChatDetail] 请求分页数据:', { page, pageSize, isLoadMore });
      const response = await messageApi.getConversation(currentUserUuid, otherUserId, token, page, pageSize);
      
      if (response.status && response.data.messages) {
        console.log('[ChatDetail] 后端返回的消息数据:', response.data.messages);
        // 转换后端消息格式为前端需要的格式
        const conversationMessages = response.data.messages.map((msg, index) => {
          const imageUrl = msg.imageUrl || msg.file_url || null;
          const messageType = msg.type || msg.message_type || 'text';
          
          // 调试日志：检查图片消息数据
          if (imageUrl || messageType === 'image') {
            console.log('[ChatDetail] 发现图片消息:', {
              id: msg.uuid || index,
              imageUrl: imageUrl,
              file_url: msg.file_url,
              type: messageType,
              message_type: msg.message_type,
              content: msg.content,
              width: msg.width,
              height: msg.height
            });
          }
          
          return {
            id: msg.uuid || index,
            // 对于图片消息，不显示content作为文本
            text: (msg.content && !imageUrl) ? msg.content : '',
            timestamp: new Date(msg.created_at),
            isBottle: msg.status === 'bottle', // 标记是否为瓶子消息
            duration: msg.duration || 0, // 添加时长信息
            audioData: msg.audioData || null, // 添加音频数据
            audioUrl: msg.audioUrl || null, // 添加音频URL
            imageUrl: imageUrl, // 添加图片URL（支持imageUrl和file_url字段）
            width: msg.width || null, // 添加图片宽度
            height: msg.height || null, // 添加图片高度
            type: messageType, // 添加消息类型（支持type和message_type字段）
            user: {
              id: msg.sender_uuid === currentUserUuid ? currentUserUuid : msg.sender_uuid, // 使用实际的UUID
              name: msg.sender_uuid === currentUserUuid ? '我' : (user.name || '对方'),
              avatar: msg.sender_uuid === currentUserUuid ? (userAvatar || currentUserAvatar) : (user.avatar || '👤'),
            },
          };
        });
        
        console.log('[ChatDetail] 加载对话历史成功:', {
          messageCount: conversationMessages.length,
          currentUserUuid: currentUserUuid,
          otherUserId: otherUserId,
          page: page,
          isLoadMore: isLoadMore
        });
        
        if (isLoadMore) {
          // 加载更多消息，添加到现有消息前面
          // 由于后端返回的是倒序，需要反转后再添加
          const reversedMessages = [...conversationMessages].reverse();
          setMessages(prevMessages => [...reversedMessages, ...prevMessages]);
          setCurrentPage(page);
        } else {
          // 首次加载或刷新，替换所有消息
          // 由于后端返回的是倒序，需要反转后显示
          const reversedMessages = [...conversationMessages].reverse();
          setMessages(reversedMessages);
          setCurrentPage(0);
        }
        
        // 检查是否还有更多消息
        if (response.data.pagination) {
          setHasMoreMessages(response.data.pagination.hasMore);
        } else {
          setHasMoreMessages(conversationMessages.length === pageSize);
        }
        
        // 确保消息设置完成后滚动到底部（仅在首次加载时）
        if (!isLoadMore) {
          setTimeout(() => {
            if (scrollViewRef.current) {
              scrollViewRef.current.scrollToEnd({ animated: true });
            }
          }, 100);
        }
      } else {
        console.warn('加载对话历史失败:', response.message);
        // 如果没有历史消息，且是从瓶子来的，显示瓶子消息
        if (user.bottleMessage) {
          setMessages([{
            id: 1,
            text: user.bottleMessage,
            timestamp: new Date(),
            user: {
              id: user.id,
              name: user.name,
              avatar: user.avatar,
            },
          }]);
        }
      }
    } catch (error) {
      console.error('加载对话历史失败:', error);
      // 如果加载失败，且是从瓶子来的，显示瓶子消息
      if (user.bottleMessage) {
        setMessages([{
          id: 1,
          text: user.bottleMessage,
          timestamp: new Date(),
          user: {
            id: user.id,
            name: user.name,
            avatar: user.avatar,
          },
        }]);
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // 加载更多历史消息
  const loadMoreMessages = async () => {
    if (isLoadingMore || !hasMoreMessages) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      let userAvatar = '👤';
      if (userInfo) {
        const currentUser = JSON.parse(userInfo);
        userAvatar = currentUser.avatar || '👤';
      }
      
      await loadConversationHistory(userAvatar, nextPage, true);
    } catch (error) {
      console.error('加载更多消息失败:', error);
    }
  };
  
  // 计算状态栏和导航栏高度
  const statusBarHeight = StatusBar.currentHeight || 0;
  const navigationBarHeight = Platform.OS === 'ios' ? 44 : 56; // iOS导航栏44px，Android 56px
  const inputContainerHeight = 70; // 输入框高度（增加一些缓冲）
  const totalHeaderHeight = statusBarHeight + navigationBarHeight;
  
  // 计算动态输入框高度
  const dynamicInputHeight = keyboardHeight > 0 ? 0 : 70;
  
  // 计算可用高度，确保不被遮挡
  const availableHeight = Dimensions.get('window').height - totalHeaderHeight - dynamicInputHeight - (keyboardHeight > 0 ? keyboardHeight - 40 : 0) - 10;

  // 发起语音通话
  const startVoiceCall = async () => {
    try {
      console.log('[VoiceCall] 开始发起通话...');
      
      // 检查用户信息
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) {
        console.error('[VoiceCall] 用户信息不存在');
        Alert.alert('提示', '请先登录');
        return;
      }
      
      const currentUser = JSON.parse(userInfo);
      const receiverId = user.sender_uuid || user.id;
      
      console.log('[VoiceCall] 用户信息检查完成:', {
        currentUser: currentUserUuid,
        receiverId: receiverId,
        calleeName: user.name,
        hasNavigation: !!navigation,
        hasUser: !!user
      });
      
      // 检查必要参数
      if (!currentUserUuid) {
        console.error('[VoiceCall] 当前用户UUID不存在');
        Alert.alert('错误', '用户信息不完整');
        return;
      }
      
      if (!receiverId) {
        console.error('[VoiceCall] 接收方ID不存在');
        Alert.alert('错误', '无法获取对方信息');
        return;
      }
      
      // 检查Socket连接
      const socket = global.socket;
      if (!socket) {
        console.error('[VoiceCall] Socket未连接');
        Alert.alert('错误', '网络连接异常，请重新登录');
        return;
      }
      
      console.log('[VoiceCall] Socket连接状态:', socket.connected);
      
      // 导航到语音通话页面
      console.log('[VoiceCall] 准备导航到通话页面...');
      navigation.getParent()?.navigate('VoiceCall', {
        caller: {
          id: currentUserUuid,
          name: currentUser.nickname || currentUser.username,
          avatar: currentUser.avatar || '👤',
        },
        callee: {
          id: receiverId,
          name: user.name,
          avatar: user.avatar || '👤',
        },
        isIncoming: false, // 发起方
      });
      
      console.log('[VoiceCall] 导航完成');
      
    } catch (error) {
      console.error('[VoiceCall] 发起通话失败:', error);
      Alert.alert('错误', `无法发起通话: ${error.message}`);
    }
  };

  useEffect(() => {
    // 设置导航标题
    navigation.setOptions({
      title: user.name,
      headerStyle: {
        backgroundColor: '#007AFF',
      },
      headerTintColor: 'white',
      headerTitleStyle: {
        fontWeight: 'bold',
      },
      headerRight: () => (
        <TouchableOpacity 
          onPress={startVoiceCall}
          style={{ marginRight: 15 }}
        >
          <Text style={{ fontSize: 24 }}>📞</Text>
        </TouchableOpacity>
      ),
    });

    // 键盘监听
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      console.log('键盘高度:', e.endCoordinates.height); // 调试信息
      setKeyboardHeight(e.endCoordinates.height);
      setIsKeyboardVisible(true);
      // 延迟滚动到底部，确保键盘完全显示
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('键盘隐藏'); // 调试信息
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [user.name, navigation]);

  // 录音权限
  useEffect(() => {
    (async () => {
      try {
        await Audio.requestPermissionsAsync();
      } catch (e) {
        console.warn('请求录音权限失败', e);
      }
    })();
  }, []);

  // 切换语音输入模式
  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (isVoiceMode) {
      // 退出语音模式时，清空输入文本
      setInputText('');
    }
  };

  const startRecording = async () => {
    try {
      console.log('[Voice] 开始录音...');
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current && clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
      console.log('[Voice] 录音已开始');
    } catch (e) {
      console.error('[Voice] 开始录音失败:', e);
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      console.log('[Voice] 停止录音...');
      if (!recordingRef.current) {
        console.log('[Voice] 没有录音对象，直接返回');
        return;
      }
      clearInterval(recordTimerRef.current);
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);
      console.log('[Voice] 录音文件URI:', uri);
      
      if (!uri) {
        console.error('[Voice] 录音文件URI为空');
        return;
      }

      // 读取音频文件为 ArrayBuffer
      console.log('[Voice] 读取音频文件...');
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      const audioData = new Uint8Array(arrayBuffer);
      console.log('[Voice] 音频数据长度:', audioData.length);

      // 获取当前用户信息
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (!userInfo) {
        console.error('[Voice] 未找到用户信息');
        return;
      }
      const currentUser = JSON.parse(userInfo);
      const receiverId = user.sender_uuid || user.id;
      const mimeType = Platform.OS === 'android' ? 'audio/webm' : 'audio/m4a';

      // 通过 WebSocket 发送语音消息
      console.log('[Voice] 通过 WebSocket 发送语音消息...');
      const socket = global.socket; // 假设 socket 存储在全局变量中
      if (!socket) {
        console.error('[Voice] WebSocket 连接不存在');
        Alert.alert('提示', '网络连接异常');
        return;
      }

      socket.emit('voice_message', {
        from: currentUserUuid,
        to: receiverId,
        audioData: Array.from(audioData), // 转换为普通数组以便 JSON 传输
        duration: recordSeconds,
        mimeType: mimeType
      });

      console.log('[Voice] 语音消息已发送，时长:', recordSeconds, '秒');
      
      // 添加到本地消息列表
      setMessages((prev) => ([...prev, {
        id: Date.now(),
        text: '',
        audioData: audioData, // 存储音频数据
        audioUrl: uri, // 本地播放用
        duration: recordSeconds, // 添加时长信息
        timestamp: new Date(),
          user: { id: currentUserUuid, name: '我', avatar: currentUserAvatar },
      }]));
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      console.error('[Voice] 停止录音/发送失败:', e);
      setIsRecording(false);
      Alert.alert('提示', '语音发送失败');
    }
  };

  const playAudio = async (url, audioData, messageId) => {
    try {
      // 如果正在播放其他消息，先停止
      if (playingMessageId && playingMessageId !== messageId) {
        setPlayingMessageId(null);
        setPlayingProgress(0);
      }
      
      // 设置当前播放状态
      setPlayingMessageId(messageId);
      setPlayingProgress(0);
      
      let sound;
      
      if (audioData && audioData.length > 0) {
        // 播放 WebSocket 接收的音频数据
        console.log('[Voice] 播放 WebSocket 音频数据，长度:', audioData.length);
        console.log('[Voice] 音频数据类型:', typeof audioData, Array.isArray(audioData));
        
        // 在 React Native 中，我们需要将音频数据写入临时文件
        const fileName = `voice_${Date.now()}.m4a`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        console.log('[Voice] 临时文件路径:', fileUri);
        
        // 将音频数据转换为 Uint8Array
        let uint8Array;
        if (Array.isArray(audioData)) {
          uint8Array = new Uint8Array(audioData);
        } else if (audioData instanceof Uint8Array) {
          uint8Array = audioData;
        } else {
          console.error('[Voice] 音频数据格式不支持:', typeof audioData);
          return;
        }
        
        console.log('[Voice] 转换后的 Uint8Array 长度:', uint8Array.length);
        
        // 将 Uint8Array 转换为 base64 然后写入文件
        let binary = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binary += String.fromCharCode(uint8Array[i]);
        }
        // 使用 React Native 兼容的 base64 编码
        let base64Data;
        try {
          base64Data = btoa(binary);
        } catch (e) {
          // 如果 btoa 不可用，使用手动实现
          console.log('[Voice] btoa 不可用，使用手动 base64 编码');
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          let result = '';
          let i = 0;
          while (i < binary.length) {
            const a = binary.charCodeAt(i++);
            const b = i < binary.length ? binary.charCodeAt(i++) : 0;
            const c = i < binary.length ? binary.charCodeAt(i++) : 0;
            const bitmap = (a << 16) | (b << 8) | c;
            result += chars.charAt((bitmap >> 18) & 63);
            result += chars.charAt((bitmap >> 12) & 63);
            result += i - 2 < binary.length ? chars.charAt((bitmap >> 6) & 63) : '=';
            result += i - 1 < binary.length ? chars.charAt(bitmap & 63) : '=';
          }
          base64Data = result;
        }
        console.log('[Voice] Base64 数据长度:', base64Data.length);
        
        await FileSystem.writeAsStringAsync(fileUri, base64Data, {
          encoding: 'base64',
        });
        console.log('[Voice] 文件写入完成');
        
        const { sound: soundObject } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
        sound = soundObject;
        console.log('[Voice] 音频播放器创建成功');
      } else if (url) {
        // 播放本地或远程 URL
        console.log('[Voice] 播放音频 URL:', url);
        const { sound: soundObject } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
        sound = soundObject;
      } else {
        console.error('[Voice] 没有可播放的音频数据');
        return;
      }
      
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded) {
          // 更新播放进度
          const progress = status.positionMillis / status.durationMillis;
          setPlayingProgress(progress);
          
          if (status.didJustFinish) {
            console.log('[Voice] 音频播放完成');
            setPlayingMessageId(null);
            setPlayingProgress(0);
            sound.unloadAsync();
          }
        }
      });
    } catch (e) {
      console.error('[Voice] 播放语音失败:', e);
      console.error('[Voice] 错误详情:', e.message, e.stack);
    }
  };

  useEffect(() => {
    // 自动滚动到底部 - 使用setTimeout确保DOM更新完成
    if (messages.length > 0 && scrollViewRef.current) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
    }
  }, [messages]);

  // 键盘监听器
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (event) => {
      console.log('[Keyboard] 键盘显示，高度:', event.endCoordinates.height);
      setKeyboardHeight(event.endCoordinates.height);
      setIsKeyboardVisible(true);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      console.log('[Keyboard] 键盘隐藏');
      setKeyboardHeight(0);
      setIsKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener?.remove();
      keyboardDidHideListener?.remove();
    };
  }, []);

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (!token || !userInfo) {
        Alert.alert('提示', '请先登录');
        return;
      }

      const currentUser = JSON.parse(userInfo);
      
      console.log('[SEND] 准备发送消息:', {
        receiverId: user.sender_uuid || user.id,
        content: inputText.trim(),
        currentUserUuid: currentUserUuid,
        hasToken: !!token
      });

      // 调用后端API发送消息
      const response = await messageApi.sendMessage(user.sender_uuid || user.id, inputText.trim(), token);
      
      console.log('[SEND] 后端响应:', response);
      
      if (response.status) {
        // 发送成功，添加到本地消息列表
        const newMessage = {
          id: Date.now(),
          text: inputText,
          timestamp: new Date(),
          user: {
            id: currentUserUuid, // 使用当前用户的 UUID
            name: '我',
            avatar: currentUserAvatar,
          },
        };
        console.log('[Message] 添加本地文本消息:', {
          messageId: newMessage.id,
          userId: newMessage.user.id,
          currentUserUuid: currentUserUuid,
          shouldBeOnRight: newMessage.user.id === currentUserUuid
        });
        setMessages(prev => [...prev, newMessage]);
        setInputText('');
        
        // 延迟滚动到底部，确保新消息已渲染
        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      } else {
        Alert.alert('发送失败', response.message || '消息发送失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      Alert.alert('错误', '网络连接失败，请稍后再试');
    }
  };

  const formatTime = (date) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        return '--:--';
      }
      return dateObj.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('[ChatDetail] 时间格式化错误:', error);
      return '--:--';
    }
  };

  return (
    <View style={styles.container}>
      <View 
        style={[
          styles.scrollContainer,
          { 
            height: availableHeight
          }
        ]}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom: keyboardHeight > 0 ? keyboardHeight + 80 : 80, // 键盘弹起时增加底部边距
            }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onScroll={(event) => {
            const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
            const isNearTop = contentOffset.y <= 100; // 距离顶部100px时触发加载更多
            
            if (isNearTop && hasMoreMessages && !isLoadingMore) {
              loadMoreMessages();
            }
          }}
          scrollEventThrottle={400}
        >
        <View style={styles.messagesContainer}>
          {/* 加载更多指示器 */}
          {isLoadingMore && (
            <View style={styles.loadMoreContainer}>
              <Text style={styles.loadMoreText}>加载历史消息...</Text>
            </View>
          )}
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>加载对话中...</Text>
            </View>
          ) : (
                  messages.map((message) => {
                    // 调试日志：检查消息对齐逻辑
                    const isMyMessage = message.user.id === currentUserUuid;
                    console.log('[ChatDetail] 消息对齐检查:', {
                      messageId: message.id,
                      messageUserId: message.user.id,
                      messageUserIdType: typeof message.user.id,
                      currentUserUuid: currentUserUuid,
                      currentUserUuidType: typeof currentUserUuid,
                      isMyMessage: isMyMessage,
                      messageText: message.text?.substring(0, 20) + '...',
                      messageUserName: message.user.name
                    });
                    
                    // 调试日志：检查消息数据
                    if (message.audioUrl || message.audioData) {
                      console.log('[Voice] 发现语音消息:', {
                        id: message.id,
                        hasAudioUrl: !!message.audioUrl,
                        hasAudioData: !!message.audioData,
                        audioDataLength: message.audioData ? message.audioData.length : 0,
                        duration: message.duration
                      });
                    }
                    return (
            <View 
              key={message.id} 
              style={[
                styles.messageWrapper,
                message.user.id === currentUserUuid ? styles.myMessage : styles.otherMessage
              ]}
            >
              <View style={styles.messageContent}>
                <View style={[
                  styles.messageHeader,
                  message.user.id === currentUserUuid ? styles.myMessageHeader : styles.otherMessageHeader
                ]}>
                  {message.user.id === currentUserUuid ? (
                    // 我的消息：时间 + 用户名 + 头像
                    <>
                      <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
                      <Text style={styles.userName}>{message.user.name}</Text>
                      {typeof message.user.avatar === 'string' && message.user.avatar.startsWith('http') ? (
                        <Image source={{ uri: message.user.avatar }} style={styles.userAvatarImage} />
                      ) : (
                        <Text style={styles.avatar}>{message.user.avatar || currentUserAvatar}</Text>
                      )}
                    </>
                  ) : (
                    // 对方消息：头像 + 用户名 + 时间
                    <>
                      {typeof message.user.avatar === 'string' && message.user.avatar.startsWith('http') ? (
                        <Image source={{ uri: message.user.avatar }} style={styles.userAvatarImage} />
                      ) : (
                        <Text style={styles.avatar}>{message.user.avatar || currentUserAvatar}</Text>
                      )}
                      <Text style={styles.userName}>{message.user.name}</Text>
                      <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
                    </>
                  )}
                </View>
                {(message.imageUrl || message.type === 'image') ? (
                  // 阅后即焚图片消息样式
                  <View style={[
                    styles.burnAfterReadingContainer,
                    message.user.id === currentUserUuid ? styles.burnAfterReadingRight : styles.burnAfterReadingLeft
                  ]}>
                    {(() => {
                      const imageUrl = message.imageUrl || message.file_url;
                      const isViewed = viewedImages.has(imageUrl);
                      
                      return (
                        <View style={[
                          styles.burnAfterReadingBubble,
                          isViewed && styles.burnedBubble // 已查看的样式
                        ]}>
                          {/* 闪电图标 */}
                          <View style={styles.lightningIcon}>
                            <Text style={styles.lightningSymbol}>⚡</Text>
                          </View>
                          
                          {/* 状态文字 */}
                          <Text style={styles.burnAfterReadingTitle}>
                            {isViewed ? '已阅后即焚' : '阅后即焚'}
                          </Text>
                          
                          {/* 操作提示 */}
                          <Text style={styles.burnAfterReadingHint}>
                            {isViewed ? '图片已销毁' : '长按查看图片'}
                          </Text>
                          
                          {/* 长按功能（仅未查看时可用） */}
                          {!isViewed && (
                            <TouchableOpacity 
                              onLongPress={() => {
                                console.log('[Image] 长按图片消息:', {
                                  id: message.id,
                                  imageUrl: message.imageUrl,
                                  file_url: message.file_url,
                                  finalUrl: imageUrl,
                                  fullUrl: getImageUrl(imageUrl),
                                  width: message.width,
                                  height: message.height,
                                  type: message.type,
                                  isViewed: isViewed
                                });
                                console.log('[Image] 准备显示预览');
                                if (imageUrl) {
                                  showImagePreview(imageUrl);
                                } else {
                                  console.error('[Image] 图片URL为空，无法预览');
                                }
                              }}
                              delayLongPress={800} // 长按800毫秒后触发
                              onPress={() => {
                                // 短按无操作，提示用户长按
                                console.log('[Image] 短按图片，请长按查看');
                              }}
                              style={styles.imageTouchArea}
                            />
                          )}
                        </View>
                      );
                    })()}
                  </View>
                  ) : (
                    // 文本和语音消息使用气泡样式
                    <View style={[
                      styles.messageBubble,
                      message.user.id === currentUserUuid ? styles.myBubble : styles.otherBubble,
                      message.isBottle && styles.bottleBubble // 瓶子消息特殊样式
                    ]}>
                      {/* 调试日志：显示消息数据 */}
                      {console.log('[ChatDetail] 渲染消息:', {
                        id: message.id,
                        type: message.type,
                        imageUrl: message.imageUrl,
                        file_url: message.file_url,
                        content: message.text,
                        isImage: !!(message.imageUrl || message.type === 'image')
                      })}
                    {message.isBottle && (
                      <Text style={styles.bottleLabel}>🌊 漂流瓶</Text>
                    )}
                    {message.audioUrl || message.audioData ? (
                    <TouchableOpacity onPress={() => {
                      console.log('[Voice] 点击播放按钮，音频数据:', {
                        hasAudioUrl: !!message.audioUrl,
                        hasAudioData: !!message.audioData,
                        audioDataLength: message.audioData ? message.audioData.length : 0,
                        audioUrl: message.audioUrl
                      });
                      playAudio(message.audioUrl, message.audioData, message.id);
                    }}>
                      <View style={styles.voiceMessageContainer}>
                        <View style={styles.voiceMessageContent}>
                          <Text style={[
                            styles.voiceIcon,
                            playingMessageId === message.id && styles.voiceIconPlaying
                          ]}>
                            {playingMessageId === message.id ? '⏸️' : '▶️'}
                          </Text>
                          <View style={styles.voiceMessageTextContainer}>
                            <Text style={[
                              styles.messageText,
                              message.user.id === currentUserUuid ? styles.myText : styles.otherText
                            ]}>
                              语音消息
                            </Text>
                            <Text style={[
                              styles.voiceMessageDuration,
                              message.user.id === currentUserUuid ? styles.myVoiceDuration : styles.otherVoiceDuration
                            ]}>
                              {message.duration ? `${message.duration}s` : '0s'}
                            </Text>
                          </View>
                        </View>
                        {playingMessageId === message.id && (
                          <View style={styles.voiceProgressContainer}>
                            <View style={[
                              styles.voiceProgressBar,
                              { width: `${playingProgress * 100}%` }
                            ]} />
                          </View>
                        )}
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <Text style={[
                      styles.messageText,
                      message.user.id === currentUserUuid ? styles.myText : styles.otherText
                    ]}>
                      {message.text}
                    </Text>
                  )}
                  </View>
                )}
              </View>
            </View>
                    );
                  })
                )}
        </View>
        </ScrollView>
      </View>
      
      <View 
        style={[
          styles.inputContainer,
          { 
            bottom: keyboardHeight > 0 ? keyboardHeight + 12 : 0, // 键盘出现时在键盘上方12px
            position: 'absolute',
            minHeight: keyboardHeight > 0 ? 60 : 70, // 键盘出现时稍微减少高度
            paddingVertical: keyboardHeight > 0 ? 8 : 10, // 键盘出现时减少内边距
            paddingBottom: keyboardHeight > 0 ? 8 : 10, // 底部内边距根据键盘状态调整
          }
        ]}
      >
        {/* 麦克风/键盘切换按钮 */}
        <TouchableOpacity
          style={styles.voiceButton}
          onPress={toggleVoiceMode}
        >
          <Text style={styles.buttonIcon}>{isVoiceMode ? '⌨️' : '🔊'}</Text>
        </TouchableOpacity>
        {isVoiceMode ? (
          <TouchableOpacity
            style={styles.voiceInputButton}
            onLongPress={startRecording}
            onPressOut={stopRecording}
            delayLongPress={200}
          >
            <Text style={styles.voiceInputText}>
              {isRecording ? `录音中... ${recordSeconds}s` : '长按 说话'}
            </Text>
          </TouchableOpacity>
        ) : (
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="发送消息..."
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
        )}
        {/* 选择图片按钮 */}
        <TouchableOpacity style={[styles.voiceButton, { marginRight: 8 }]} onPress={pickAndSendImage}>
          <Text style={styles.buttonIcon}>🏞️</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* 图片预览 Modal（阅后即焚版本） */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImagePreview}
      >
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity 
            style={styles.imagePreviewBackground}
            activeOpacity={1}
            onPress={closeImagePreview}
          >
            <View style={styles.imagePreviewContent}>
              {/* 移除叉号按钮，改为下滑关闭 */}
              <View style={styles.swipeIndicator}>
                <Text style={styles.swipeHintText}>下滑关闭</Text>
              </View>
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('[Image] 预览图片加载失败:', {
                    error: error,
                    previewImageUrl: previewImageUrl,
                    imageSource: { uri: previewImageUrl }
                  });
                  // 关闭预览
                  closeImagePreview();
                }}
              />
              {/* 阅后即焚倒计时提示 */}
              <View style={styles.burnTimerContainer}>
                <Text style={styles.burnTimerText}>阅后即焚 • 3秒后自动关闭</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 60, // 再增加10px，确保最后一条消息有足够空间
  },
  messagesContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  messageWrapper: {
    marginVertical: 5,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  myMessageHeader: {
    justifyContent: 'flex-end',
  },
  otherMessageHeader: {
    justifyContent: 'flex-start',
  },
  avatar: {
    fontSize: 20,
    marginHorizontal: 5,
  },
  userAvatarImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginHorizontal: 5,
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    marginHorizontal: 5,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginHorizontal: 5,
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '100%',
    alignItems: 'center',
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myText: {
    color: 'white',
  },
  otherText: {
    color: '#000',
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
    minHeight: 70,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    minHeight: 40,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  voiceButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EFEFF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  buttonIcon: {
    fontSize: 16,
    textAlign: 'center',
  },
  voiceInputButton: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f8f8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  voiceInputText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  loadMoreContainer: {
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: -15,
    marginTop: -10,
  },
  loadMoreText: {
    fontSize: 14,
    color: '#999',
  },
  bottleBubble: {
    borderWidth: 2,
    borderColor: '#4A90E2',
    backgroundColor: '#E8F4FD',
  },
  bottleLabel: {
    fontSize: 12,
    color: '#4A90E2',
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  imageContainer: {
    alignItems: 'center',
  },
  imageMsg: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageMessageContainer: {
    paddingHorizontal: 5,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: 'transparent', // 透明背景，无边框
  },
  imageSizeText: {
    fontSize: 10,
    color: '#666',
    marginTop: 4,
  },
  longPressHint: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  longPressHintText: {
    fontSize: 8,
    color: 'white',
    fontWeight: '500',
  },
  // 阅后即焚样式
  burnAfterReadingContainer: {
    marginVertical: 4,
    marginHorizontal: 10,
  },
  burnAfterReadingRight: {
    alignItems: 'flex-end',
  },
  burnAfterReadingLeft: {
    alignItems: 'flex-start',
  },
  burnAfterReadingBubble: {
    backgroundColor: '#FFB366', // 橙色背景
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    minWidth: 120,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lightningIcon: {
    marginBottom: 8,
  },
  lightningSymbol: {
    fontSize: 24,
    color: '#FF6B35', // 深橙色闪电
  },
  burnAfterReadingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B35', // 深橙色文字
    marginBottom: 4,
  },
  burnAfterReadingHint: {
    fontSize: 12,
    color: '#FF8C42', // 中等橙色
    fontWeight: '500',
  },
  // 已查看的图片样式
  burnedBubble: {
    backgroundColor: '#CCCCCC', // 灰色背景
    opacity: 0.7, // 半透明效果
  },
  imageTouchArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  // 语音消息样式
  voiceMessageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  voiceMessageContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  voiceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  voiceIconPlaying: {
    color: '#4A90E2',
  },
  voiceProgressContainer: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 1.5,
    marginTop: 4,
    overflow: 'hidden',
  },
  voiceProgressBar: {
    height: '100%',
    backgroundColor: '#4A90E2',
    borderRadius: 1.5,
  },
  voiceMessageTextContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  voiceMessageDuration: {
    fontSize: 12,
    marginTop: 2,
    opacity: 0.8,
    fontWeight: '500',
  },
  myVoiceDuration: {
    color: '#FFFFFF',
  },
  otherVoiceDuration: {
    color: '#666666',
  },
  // 图片预览样式
  imagePreviewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewBackground: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 50,
  },
  // 下滑关闭提示
  swipeIndicator: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  swipeHintText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  // 阅后即焚倒计时
  burnTimerContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
  },
  burnTimerText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(255, 107, 53, 0.8)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    textAlign: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width - 40,
    maxHeight: Dimensions.get('window').height - 100,
  },
});
