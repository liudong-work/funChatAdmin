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
    
    // ICE 服务器配置（使用 Google 的免费 STUN 服务器）
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
        }
      ]
    };
  }
  
  /**
   * 初始化 WebRTC 服务
   * @param {Object} socket - Socket.IO 实例
   */
  initialize(socket) {
    this.socket = socket;
    console.log('[WebRTC] 服务初始化完成');
  }
  
  /**
   * 获取本地音频流
   */
  async getLocalStream() {
    try {
      console.log('[WebRTC] 请求本地音频流...');
      
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: false, // 仅语音通话
      });
      
      this.localStream = stream;
      console.log('[WebRTC] 本地音频流获取成功:', {
        id: stream.id,
        audioTracks: stream.getAudioTracks().length
      });
      
      return stream;
    } catch (error) {
      console.error('[WebRTC] 获取本地音频流失败:', error);
      throw error;
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
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      await this.peerConnection.setLocalDescription(offer);
      console.log('[WebRTC] Offer 创建成功，发送给对方...');
      
      // 通过 WebSocket 发送 Offer
      this.socket.emit('call_offer', {
        from: callerId,
        to: calleeId,
        offer: offer.toJSON(),
        caller: {
          id: callerId,
        }
      });
      
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
      await this.peerConnection.setLocalDescription(answer);
      console.log('[WebRTC] Answer 创建成功，发送给对方...');
      
      // 通过 WebSocket 发送 Answer
      this.socket.emit('call_answer', {
        from: calleeId,
        to: callerId,
        answer: answer.toJSON(),
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
      console.log('[WebRTC] 处理 Answer...');
      
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
   * 切换静音
   */
  toggleMute(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log('[WebRTC] 静音状态:', muted ? '已静音' : '未静音');
    }
  }
  
  /**
   * 获取远程音频流
   */
  getRemoteStream() {
    return this.remoteStream;
  }
  
  /**
   * 关闭连接
   */
  close() {
    try {
      console.log('[WebRTC] 关闭连接...');
      
      // 停止本地音频流
      if (this.localStream) {
        this.localStream.getTracks().forEach(track => {
          track.stop();
        });
        this.localStream = null;
      }
      
      // 关闭 PeerConnection
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      this.remoteStream = null;
      console.log('[WebRTC] 连接已关闭');
      
    } catch (error) {
      console.error('[WebRTC] 关闭连接失败:', error);
    }
  }
}

// 导出单例
export default new WebRTCService();

