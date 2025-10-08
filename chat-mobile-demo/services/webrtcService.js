import { mediaDevices, RTCPeerConnection, RTCIceCandidate, RTCSessionDescription } from 'react-native-webrtc';

/**
 * WebRTC 服务
 * 管理 P2P 语音通话连接
 */
class WebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.isInitialized = false;
    
    // ICE 服务器配置（使用多个 STUN 服务器提高连接成功率）
    this.configuration = {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        },
        {
          urls: 'stun:stun1.l.google.com:19302'
        },
        {
          urls: 'stun:stun2.l.google.com:19302'
        },
        {
          urls: 'stun:stun3.l.google.com:19302'
        },
        {
          urls: 'stun:stun4.l.google.com:19302'
        }
      ],
      // 优化连接策略
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    };
    
    // 音频质量配置（优化语音通话质量）
    this.audioConstraints = {
      audio: {
        echoCancellation: true,      // 回声消除
        noiseSuppression: true,       // 噪音抑制
        autoGainControl: true,        // 自动增益控制
        sampleRate: 48000,            // 采样率
        sampleSize: 16,               // 采样位数
        channelCount: 1               // 单声道（减少带宽）
      },
      video: false
    };
  }
  
  /**
   * 初始化 WebRTC 服务
   * @param {Object} socket - Socket.IO 实例
   */
  initialize(socket) {
    if (!socket) {
      console.error('[WebRTC] Socket 未提供');
      throw new Error('Socket instance is required');
    }
    
    this.socket = socket;
    this.isInitialized = true;
    console.log('[WebRTC] 服务初始化完成');
  }
  
  /**
   * 获取本地音频流（带音频质量优化）
   */
  async getLocalStream() {
    try {
      console.log('[WebRTC] 请求本地音频流（高质量配置）...');
      
      // 使用优化的音频约束
      const stream = await mediaDevices.getUserMedia(this.audioConstraints);
      
      this.localStream = stream;
      
      // 获取音频轨道信息
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        const settings = audioTrack.getSettings();
        console.log('[WebRTC] 本地音频流获取成功:', {
          id: stream.id,
          audioTracks: stream.getAudioTracks().length,
          trackLabel: audioTrack.label,
          sampleRate: settings.sampleRate,
          channelCount: settings.channelCount,
          echoCancellation: settings.echoCancellation,
          noiseSuppression: settings.noiseSuppression,
          autoGainControl: settings.autoGainControl
        });
      }
      
      return stream;
    } catch (error) {
      console.error('[WebRTC] 获取本地音频流失败:', error);
      
      // 提供更友好的错误信息
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        throw new Error('麦克风权限被拒绝，请在设置中允许应用访问麦克风');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        throw new Error('未找到可用的麦克风设备');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        throw new Error('麦克风正在被其他应用使用');
      } else {
        throw new Error(`获取音频失败: ${error.message}`);
      }
    }
  }
  
  /**
   * 创建 PeerConnection
   */
  createPeerConnection(callerId, calleeId, isInitiator) {
    try {
      console.log('[WebRTC] 创建 PeerConnection...', {
        callerId,
        calleeId,
        isInitiator
      });
      
      // 确保之前的连接已关闭
      if (this.peerConnection) {
        console.log('[WebRTC] 关闭之前的连接');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      this.peerConnection = new RTCPeerConnection(this.configuration);
      
      // 添加本地音频轨道
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          this.peerConnection.addTrack(track, this.localStream);
          console.log('[WebRTC] 添加本地音频轨道:', track.kind);
        });
      }
      
      // 监听 ICE 候选者
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          console.log('[WebRTC] 生成 ICE 候选者');
          const targetId = isInitiator ? calleeId : callerId;
          this.socket.emit('ice_candidate', {
            from: isInitiator ? callerId : calleeId,
            to: targetId,
            candidate: event.candidate.toJSON(),
          });
        }
      };
      
      // 监听连接状态变化
      this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection && this.peerConnection.iceConnectionState) {
          console.log('[WebRTC] ICE 连接状态:', this.peerConnection.iceConnectionState);
          
          // 处理连接失败的情况
          if (this.peerConnection.iceConnectionState === 'failed') {
            console.error('[WebRTC] ICE 连接失败');
            this.close();
          }
        }
      };
      
      // 监听信令状态变化
      this.peerConnection.onsignalingstatechange = () => {
        if (this.peerConnection) {
          console.log('[WebRTC] 信令状态:', this.peerConnection.signalingState);
        }
      };
      
      // 监听远程音频流
      this.peerConnection.ontrack = (event) => {
        console.log('[WebRTC] 收到远程音频流');
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('[WebRTC] 远程音频流ID:', this.remoteStream.id);
        }
      };
      
      console.log('[WebRTC] PeerConnection 创建成功');
      return this.peerConnection;
      
    } catch (error) {
      console.error('[WebRTC] 创建 PeerConnection 失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建 Offer（发起方调用）
   */
  async createOffer(callerId, calleeId) {
    try {
      console.log('[WebRTC] 创建 Offer...');
      
      if (!this.peerConnection) {
        this.createPeerConnection(callerId, calleeId, true);
      }
      
      // 创建 Offer 时优化音频设置
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
        voiceActivityDetection: true  // 启用语音活动检测（节省带宽）
      });
      
      // 检查 offer 是否有效
      if (!offer) {
        throw new Error('createOffer 返回了 undefined');
      }
      
      await this.peerConnection.setLocalDescription(offer);
      
      console.log('[WebRTC] Offer 创建成功:', {
        type: offer.type,
        sdpSize: offer.sdp ? offer.sdp.length : 0
      });
      
      // 手动构建 offer JSON 对象（兼容 react-native-webrtc）
      const offerData = {
        type: offer.type,
        sdp: offer.sdp
      };
      
      console.log('[WebRTC] Offer 数据准备发送:', offerData);
      
      // 通过 WebSocket 发送 Offer
      this.socket.emit('call_offer', {
        from: callerId,
        to: calleeId,
        offer: offerData,
        caller: {
          id: callerId,
        }
      });
      
      console.log('[WebRTC] Offer 已发送给对方');
      return offer;
    } catch (error) {
      console.error('[WebRTC] 创建 Offer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理 Offer 并创建 Answer（接收方调用）
   */
  async handleOffer(callerId, calleeId, offer) {
    try {
      console.log('[WebRTC] 处理 Offer...');
      
      if (!this.peerConnection) {
        this.createPeerConnection(callerId, calleeId, false);
      }
      
      const remoteDesc = new RTCSessionDescription(offer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      console.log('[WebRTC] 远程描述已设置');
      
      const answer = await this.peerConnection.createAnswer();
      
      // 检查 answer 是否有效
      if (!answer) {
        throw new Error('createAnswer 返回了 undefined');
      }
      
      await this.peerConnection.setLocalDescription(answer);
      
      console.log('[WebRTC] Answer 创建成功:', {
        type: answer.type,
        sdpSize: answer.sdp ? answer.sdp.length : 0
      });
      
      // 手动构建 answer JSON 对象（兼容 react-native-webrtc）
      const answerData = {
        type: answer.type,
        sdp: answer.sdp
      };
      
      console.log('[WebRTC] Answer 数据准备发送:', answerData);
      
      // 通过 WebSocket 发送 Answer
      this.socket.emit('call_answer', {
        from: calleeId,
        to: callerId,
        answer: answerData,
      });
      
      return answer;
    } catch (error) {
      console.error('[WebRTC] 处理 Offer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理 Answer（发起方调用）
   */
  async handleAnswer(answer) {
    try {
      console.log('[WebRTC] 处理 Answer...', {
        type: answer?.type,
        sdpSize: answer?.sdp ? answer.sdp.length : 0
      });
      
      // 检查 answer 是否有效
      if (!answer || !answer.type || !answer.sdp) {
        throw new Error('无效的 Answer 数据');
      }
      
      const remoteDesc = new RTCSessionDescription(answer);
      await this.peerConnection.setRemoteDescription(remoteDesc);
      console.log('[WebRTC] Answer 处理成功，P2P 连接建立中...');
      
    } catch (error) {
      console.error('[WebRTC] 处理 Answer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加 ICE 候选者
   */
  async addIceCandidate(candidate) {
    try {
      console.log('[WebRTC] 添加 ICE 候选者...');
      
      if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
        const iceCandidate = new RTCIceCandidate(candidate);
        await this.peerConnection.addIceCandidate(iceCandidate);
        console.log('[WebRTC] ICE 候选者添加成功');
      } else {
        console.warn('[WebRTC] PeerConnection 不存在或已关闭，无法添加 ICE 候选者');
      }
    } catch (error) {
      console.error('[WebRTC] 添加 ICE 候选者失败:', error);
    }
  }
  
  /**
   * 检查麦克风权限
   */
  async checkMicrophonePermission() {
    try {
      console.log('[WebRTC] 检查麦克风权限...');
      
      // 尝试枚举设备来检查权限
      const devices = await mediaDevices.enumerateDevices();
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      console.log('[WebRTC] 找到音频设备数量:', audioDevices.length);
      
      if (audioDevices.length === 0) {
        throw new Error('未找到可用的麦克风设备');
      }
      
      return true;
    } catch (error) {
      console.error('[WebRTC] 检查麦克风权限失败:', error);
      return false;
    }
  }
  
  /**
   * 切换静音
   */
  toggleMute(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log('[WebRTC] 静音状态:', muted ? '已静音' : '未静音');
      return true;
    }
    console.warn('[WebRTC] 无法切换静音：本地音频流不存在');
    return false;
  }
  
  /**
   * 获取远程音频流
   */
  getRemoteStream() {
    return this.remoteStream;
  }
  
  /**
   * 获取连接状态
   */
  getConnectionState() {
    if (!this.peerConnection) {
      return 'disconnected';
    }
    
    return {
      iceConnectionState: this.peerConnection.iceConnectionState,
      signalingState: this.peerConnection.signalingState,
      connectionState: this.peerConnection.connectionState
    };
  }
  
  /**
   * 关闭连接（完整清理）
   */
  close() {
    try {
      console.log('[WebRTC] 开始关闭连接...');
      
      // 停止本地音频流
      if (this.localStream) {
        console.log('[WebRTC] 停止本地音频流');
        this.localStream.getTracks().forEach(track => {
          track.stop();
          console.log(`[WebRTC] 停止轨道: ${track.kind}`);
        });
        this.localStream = null;
      }
      
      // 关闭 PeerConnection
      if (this.peerConnection) {
        console.log('[WebRTC] 关闭 PeerConnection');
        
        // 移除所有事件监听器
        this.peerConnection.onicecandidate = null;
        this.peerConnection.oniceconnectionstatechange = null;
        this.peerConnection.onsignalingstatechange = null;
        this.peerConnection.ontrack = null;
        
        // 关闭连接
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // 清理远程流
      this.remoteStream = null;
      
      console.log('[WebRTC] 连接已完全关闭');
      
    } catch (error) {
      console.error('[WebRTC] 关闭连接时出错:', error);
    }
  }
  
  /**
   * 重置服务（用于新的通话）
   */
  reset() {
    console.log('[WebRTC] 重置服务状态');
    this.close();
    this.isInitialized = false;
  }
}

// 导出单例
export default new WebRTCService();

