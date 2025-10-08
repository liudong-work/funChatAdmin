import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert, Animated, Platform } from 'react-native';
// import webrtcService from './services/webrtcService';
import webrtcService from './MockWebRTCService'; // 模拟版本（用于 Expo Go 测试）

export default function VoiceCallScreen({ route, navigation }) {
  const { caller, callee, isIncoming } = route.params;
  
  // 通话状态
  const [callStatus, setCallStatus] = useState(isIncoming ? 'incoming' : 'calling');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  
  // 动画
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const callTimerRef = useRef(null);
  
  // 获取 socket 实例
  const socket = global.socket;
  
  // 初始化 WebRTC 并监听信令
  useEffect(() => {
    console.log('[WebRTC] 检查 Socket 连接状态:', {
      socket: !!socket,
      connected: socket?.connected,
      id: socket?.id
    });
    
    if (!socket) {
      console.error('[WebRTC] Socket 未连接 - global.socket 为空');
      Alert.alert('错误', '网络连接异常，请重新登录');
      navigation.goBack();
      return;
    }
    
    if (!socket.connected) {
      console.error('[WebRTC] Socket 未连接 - 连接状态:', socket.connected);
      
      // 尝试重连
      console.log('[WebRTC] 尝试重新连接 WebSocket...');
      socket.connect();
      
      // 等待连接建立
      const checkConnection = () => {
        if (socket.connected) {
          console.log('[WebRTC] WebSocket 重连成功');
          // 重新初始化
          webrtcService.initialize(socket);
        } else {
          console.error('[WebRTC] WebSocket 重连失败');
          Alert.alert('错误', '网络连接异常，请检查网络设置');
          navigation.goBack();
        }
      };
      
      // 给连接一些时间
      setTimeout(checkConnection, 2000);
      return;
    }
    
    // 初始化 WebRTC 服务
    webrtcService.initialize(socket);
    
    // 获取本地音频流
    webrtcService.getLocalStream().catch(error => {
      console.error('[WebRTC] 获取音频权限失败:', error);
      Alert.alert('权限错误', '无法访问麦克风，请检查权限设置');
      navigation.goBack();
    });
    
    // 如果是发起方，创建 Offer
    if (!isIncoming) {
      setTimeout(async () => {
        try {
          await webrtcService.createOffer(caller.id, callee.id);
        } catch (error) {
          console.error('[WebRTC] 创建 Offer 失败:', error);
          Alert.alert('错误', '无法发起通话');
          navigation.goBack();
        }
      }, 500);
    }
    
    // 监听通话应答
    const handleCallAnswer = async (data) => {
      console.log('[WebRTC] 收到通话应答');
      try {
        await webrtcService.handleAnswer(data.answer);
        setCallStatus('connected');
      } catch (error) {
        console.error('[WebRTC] 处理应答失败:', error);
      }
    };
    
    // 监听 ICE 候选者
    const handleIceCandidate = async (data) => {
      console.log('[WebRTC] 收到 ICE 候选者');
      try {
        await webrtcService.addIceCandidate(data.candidate);
      } catch (error) {
        console.error('[WebRTC] 添加 ICE 候选者失败:', error);
      }
    };
    
    // 监听对方挂断
    const handleCallHangup = () => {
      console.log('[WebRTC] 对方已挂断');
      setCallStatus('ended');
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    };
    
    // 监听对方拒绝
    const handleCallReject = () => {
      console.log('[WebRTC] 对方已拒绝');
      Alert.alert('提示', '对方拒绝了通话');
      setCallStatus('rejected');
      setTimeout(() => {
        navigation.goBack();
      }, 1000);
    };
    
    // 监听通话失败
    const handleCallFailed = (data) => {
      console.log('[WebRTC] 通话失败:', data.reason);
      Alert.alert('通话失败', data.message || '无法建立连接');
      navigation.goBack();
    };
    
    // 注册事件监听
    socket.on('call_answer', handleCallAnswer);
    socket.on('ice_candidate', handleIceCandidate);
    socket.on('call_hangup', handleCallHangup);
    socket.on('call_reject', handleCallReject);
    socket.on('call_failed', handleCallFailed);
    
    // 清理函数
    return () => {
      console.log('[WebRTC] 清理资源...');
      socket.off('call_answer', handleCallAnswer);
      socket.off('ice_candidate', handleIceCandidate);
      socket.off('call_hangup', handleCallHangup);
      socket.off('call_reject', handleCallReject);
      socket.off('call_failed', handleCallFailed);
      
      webrtcService.close();
    };
  }, []);
  
  // 呼叫动画
  useEffect(() => {
    if (callStatus === 'calling' || callStatus === 'incoming') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [callStatus]);
  
  // 通话计时
  useEffect(() => {
    if (callStatus === 'connected') {
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
      }
    };
  }, [callStatus]);
  
  // 格式化通话时长
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // 接听通话
  const acceptCall = async () => {
    try {
      console.log('[VoiceCall] 接听通话');
      setCallStatus('connecting');
      
      // 处理来电的 Offer（需要从信令中获取）
      // 注意：Offer 应该在收到 call_offer 事件时就保存了
      // 这里我们需要从 route.params 获取或通过其他方式传递
      
      // 创建 Answer
      await webrtcService.handleOffer(caller.id, callee.id, route.params.offer);
      
      setCallStatus('connected');
    } catch (error) {
      console.error('[VoiceCall] 接听通话失败:', error);
      Alert.alert('错误', '无法接听通话');
      navigation.goBack();
    }
  };
  
  // 拒绝通话
  const rejectCall = () => {
    console.log('[VoiceCall] 拒绝通话');
    
    // 通知对方拒绝
    socket.emit('call_reject', {
      from: callee.id,
      to: caller.id,
    });
    
    setCallStatus('rejected');
    webrtcService.close();
    
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };
  
  // 挂断通话
  const hangupCall = () => {
    console.log('[VoiceCall] 挂断通话');
    
    // 通知对方挂断
    const myId = isIncoming ? callee.id : caller.id;
    const otherId = isIncoming ? caller.id : callee.id;
    
    socket.emit('call_hangup', {
      from: myId,
      to: otherId,
    });
    
    setCallStatus('ended');
    webrtcService.close();
    
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };
  
  // 切换静音
  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    webrtcService.toggleMute(newMuted);
    console.log('[VoiceCall] 静音状态:', newMuted ? '已静音' : '未静音');
  };
  
  // 切换扬声器
  const toggleSpeaker = () => {
    const newSpeaker = !isSpeaker;
    setIsSpeaker(newSpeaker);
    console.log('[VoiceCall] 扬声器:', newSpeaker ? '开启' : '关闭');
    // TODO: 实现扬声器切换（需要 native 支持）
  };
  
  // 获取状态文本
  const getStatusText = () => {
    switch (callStatus) {
      case 'calling':
        return '正在呼叫...';
      case 'incoming':
        return '来电中...';
      case 'connecting':
        return '连接中...';
      case 'connected':
        return formatDuration(callDuration);
      case 'rejected':
        return '已拒绝';
      case 'ended':
        return '通话已结束';
      default:
        return '';
    }
  };
  
  // 获取对方信息
  const otherUser = isIncoming ? caller : callee;
  
  return (
    <View style={styles.container}>
      {/* 顶部状态栏 */}
      <View style={styles.header}>
        <Text style={styles.statusText}>{getStatusText()}</Text>
      </View>
      
      {/* 用户信息区域 */}
      <View style={styles.userInfoContainer}>
        <Animated.View style={[
          styles.avatarContainer,
          { transform: [{ scale: pulseAnim }] }
        ]}>
          <Text style={styles.avatarLarge}>{otherUser?.avatar || '👤'}</Text>
        </Animated.View>
        <Text style={styles.userName}>{otherUser?.name || '对方'}</Text>
        {callStatus === 'incoming' && (
          <Text style={styles.incomingText}>📞 语音通话</Text>
        )}
      </View>
      
      {/* 控制按钮区域 */}
      <View style={styles.controlsContainer}>
        {callStatus === 'incoming' ? (
          // 来电时：接听和拒绝按钮
          <View style={styles.incomingControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.rejectButton]}
              onPress={rejectCall}
            >
              <Text style={styles.controlIcon}>❌</Text>
              <Text style={styles.controlText}>拒绝</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.acceptButton]}
              onPress={acceptCall}
            >
              <Text style={styles.controlIcon}>📞</Text>
              <Text style={styles.controlText}>接听</Text>
            </TouchableOpacity>
          </View>
        ) : callStatus === 'connected' ? (
          // 通话中：静音、扬声器、挂断
          <View style={styles.connectedControls}>
            <View style={styles.topControls}>
              <TouchableOpacity 
                style={[styles.smallControlButton, isMuted && styles.activeControl]}
                onPress={toggleMute}
              >
                <Text style={styles.smallControlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
                <Text style={styles.smallControlText}>{isMuted ? '已静音' : '静音'}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.smallControlButton, isSpeaker && styles.activeControl]}
                onPress={toggleSpeaker}
              >
                <Text style={styles.smallControlIcon}>{isSpeaker ? '🔊' : '📱'}</Text>
                <Text style={styles.smallControlText}>{isSpeaker ? '扬声器' : '听筒'}</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity 
              style={[styles.controlButton, styles.hangupButton]}
              onPress={hangupCall}
            >
              <Text style={styles.controlIcon}>📴</Text>
              <Text style={styles.controlText}>挂断</Text>
            </TouchableOpacity>
          </View>
        ) : (
          // 呼叫中：取消按钮居中
          <View style={styles.callingControls}>
            <TouchableOpacity 
              style={[styles.controlButton, styles.hangupButton]}
              onPress={hangupCall}
            >
              <Text style={styles.controlIcon}>📴</Text>
              <Text style={styles.controlText}>取消</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  userInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarLarge: {
    fontSize: 60,
  },
  userName: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  incomingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  controlsContainer: {
    paddingBottom: 60,
    paddingHorizontal: 40,
  },
  incomingControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  callingControls: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedControls: {
    alignItems: 'center',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 40,
  },
  controlButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  smallControlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeControl: {
    backgroundColor: '#007AFF',
  },
  acceptButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  hangupButton: {
    backgroundColor: '#FF3B30',
  },
  controlIcon: {
    fontSize: 32,
  },
  smallControlIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  controlText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  smallControlText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
});

