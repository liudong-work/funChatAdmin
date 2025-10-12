import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Platform, Keyboard, Dimensions, ScrollView, StatusBar, Alert, Image, Modal, SafeAreaView } from 'react-native';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { messageApi, fileApi } from './services/apiService.js';
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
  
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  
  // 图片预览状态
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const scrollViewRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef(null);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const recordTimerRef = useRef(null);
  
  // 语音输入模式状态
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  
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
        from: currentUser.uuid,
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
        from: currentUser.uuid,
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
          user: { id: currentUser.uuid, name: '我', avatar: '👤' },
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
    loadConversationHistory();
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
        const safeText = (wsMessage && wsMessage.content) || '';
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

  // 图片预览功能
  const showImagePreview = (imageUrl) => {
    console.log('[Image] 显示图片预览:', imageUrl);
    console.log('[Image] 预览状态:', { imagePreviewVisible, previewImageUrl });
    setPreviewImageUrl(imageUrl);
    setImagePreviewVisible(true);
    console.log('[Image] 预览状态已更新');
  };

  const hideImagePreview = () => {
    setImagePreviewVisible(false);
    setPreviewImageUrl('');
  };

  const loadConversationHistory = async () => {
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
      
      // 调用后端接口获取对话历史
      const response = await messageApi.getConversation(currentUser.uuid, otherUserId, token);
      
      if (response.status && response.data.messages) {
        // 转换后端消息格式为前端需要的格式
        const conversationMessages = response.data.messages.map((msg, index) => ({
          id: msg.uuid || index,
          text: msg.content,
          timestamp: new Date(msg.created_at),
          isBottle: msg.status === 'bottle', // 标记是否为瓶子消息
          duration: msg.duration || 0, // 添加时长信息
          audioData: msg.audioData || null, // 添加音频数据
          audioUrl: msg.audioUrl || null, // 添加音频URL
          imageUrl: msg.imageUrl || null, // 添加图片URL
          width: msg.width || null, // 添加图片宽度
          height: msg.height || null, // 添加图片高度
          type: msg.type || 'text', // 添加消息类型
          user: {
            id: msg.sender_uuid === currentUser.uuid ? currentUser.uuid : msg.sender_uuid, // 使用实际的UUID
            name: msg.sender_uuid === currentUser.uuid ? '我' : (user.name || '对方'),
            avatar: msg.sender_uuid === currentUser.uuid ? '👤' : (user.avatar || '👤'),
          },
        }));
        
        console.log('[ChatDetail] 加载对话历史成功:', {
          messageCount: conversationMessages.length,
          currentUserUuid: currentUser.uuid,
          otherUserId: otherUserId
        });
        setMessages(conversationMessages);
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
        currentUser: currentUser.uuid,
        receiverId: receiverId,
        calleeName: user.name,
        hasNavigation: !!navigation,
        hasUser: !!user
      });
      
      // 检查必要参数
      if (!currentUser.uuid) {
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
          id: currentUser.uuid,
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
        from: currentUser.uuid,
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
        user: { id: currentUser.uuid, name: '我', avatar: '👤' },
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
    // 自动滚动到底部
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
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
        currentUserUuid: currentUser.uuid,
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
            id: currentUser.uuid, // 使用当前用户的 UUID
            name: '我',
            avatar: '👤',
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
        >
        <View style={styles.messagesContainer}>
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
                      <Text style={styles.avatar}>{message.user.avatar}</Text>
                    </>
                  ) : (
                    // 对方消息：头像 + 用户名 + 时间
                    <>
                      <Text style={styles.avatar}>{message.user.avatar}</Text>
                      <Text style={styles.userName}>{message.user.name}</Text>
                      <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
                    </>
                  )}
                </View>
                {message.imageUrl ? (
                  // 图片消息使用特殊容器，无气泡背景
                  <View style={styles.imageMessageContainer}>
                    <TouchableOpacity onPress={() => {
                      console.log('[Image] 点击图片消息:', {
                        id: message.id,
                        imageUrl: message.imageUrl,
                        fullUrl: getImageUrl(message.imageUrl),
                        width: message.width,
                        height: message.height,
                        type: message.type
                      });
                      console.log('[Image] 准备显示预览');
                      showImagePreview(getImageUrl(message.imageUrl))
                    }}>
                      <View style={styles.imageContainer}>
                        <Image 
                          source={{ uri: getImageUrl(message.imageUrl) }} 
                          style={[
                            styles.imageMsg,
                            message.width && message.height ? {
                              width: Math.min(120, message.width),
                              height: Math.min(120, message.height),
                              aspectRatio: message.width / message.height
                            } : {}
                          ]} 
                          resizeMode="cover"
                          onLoad={() => console.log('[Image] 图片加载成功:', getImageUrl(message.imageUrl))}
                          onError={(error) => {
                            console.error('[Image] 图片加载失败:', error.nativeEvent.error, 'URL:', getImageUrl(message.imageUrl));
                            // 显示错误占位符
                          }}
                        />
                        {message.width && message.height && (
                          <Text style={styles.imageSizeText}>
                            {message.width} × {message.height}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // 文本和语音消息使用气泡样式
                  <View style={[
                    styles.messageBubble,
                    message.user.id === currentUserUuid ? styles.myBubble : styles.otherBubble,
                    message.isBottle && styles.bottleBubble // 瓶子消息特殊样式
                  ]}>
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

      {/* 图片预览 Modal */}
      <Modal
        visible={imagePreviewVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={hideImagePreview}
      >
        <View style={styles.imagePreviewContainer}>
          <TouchableOpacity 
            style={styles.imagePreviewBackground}
            activeOpacity={1}
            onPress={hideImagePreview}
          >
            <View style={styles.imagePreviewContent}>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={hideImagePreview}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
              <Image
                source={{ uri: previewImageUrl }}
                style={styles.previewImage}
                resizeMode="contain"
                onError={(error) => {
                  console.error('[Image] 预览图片加载失败:', error);
                }}
              />
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
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    maxWidth: Dimensions.get('window').width - 40,
    maxHeight: Dimensions.get('window').height - 100,
  },
});
