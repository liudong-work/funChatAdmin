/**
 * 模拟 WebRTC 服务
 * 用于在 Expo Go 中测试语音通话 UI 和逻辑
 * 不包含真实的 WebRTC 功能，但模拟了所有接口
 */

class MockWebRTCService {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.socket = null;
    this.isConnected = false;
    
    // 模拟配置
    this.configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
  }
  
  /**
   * 初始化 WebRTC 服务
   */
  initialize(socket) {
    this.socket = socket;
    console.log('[MockWebRTC] 服务初始化完成');
  }
  
  /**
   * 获取本地音频流（模拟）
   */
  async getLocalStream() {
    try {
      console.log('[MockWebRTC] 模拟获取本地音频流...');
      
      // 模拟延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.localStream = {
        id: 'mock-local-stream',
        getAudioTracks: () => [
          {
            kind: 'audio',
            enabled: true,
            stop: () => console.log('[MockWebRTC] 停止音频轨道')
          }
        ],
        getTracks: () => this.localStream.getAudioTracks()
      };
      
      console.log('[MockWebRTC] 本地音频流获取成功（模拟）');
      return this.localStream;
    } catch (error) {
      console.error('[MockWebRTC] 获取本地音频流失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建 PeerConnection（模拟）
   */
  createPeerConnection(callerId, calleeId, isInitiator) {
    try {
      console.log('[MockWebRTC] 创建 PeerConnection（模拟）...', {
        callerId,
        calleeId,
        isInitiator
      });
      
      // 确保之前的连接已关闭
      if (this.peerConnection) {
        console.log('[MockWebRTC] 关闭之前的连接');
        this.peerConnection.close();
        this.peerConnection = null;
      }
      
      // 模拟 PeerConnection 对象
      this.peerConnection = {
        iceConnectionState: 'new',
        signalingState: 'stable',
        close: () => {
          console.log('[MockWebRTC] 关闭连接');
          this.peerConnection = null;
          this.isConnected = false;
        },
        addTrack: (track, stream) => {
          console.log('[MockWebRTC] 添加音频轨道:', track.kind);
        },
        onicecandidate: null,
        oniceconnectionstatechange: null,
        onsignalingstatechange: null,
        ontrack: null
      };
      
      // 设置事件监听器（修复后的版本）
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && this.socket) {
          console.log('[MockWebRTC] 生成 ICE 候选者（模拟）');
          const targetId = isInitiator ? calleeId : callerId;
          this.socket.emit('ice_candidate', {
            from: isInitiator ? callerId : calleeId,
            to: targetId,
            candidate: event.candidate.toJSON(),
          });
        }
      };
      
      this.peerConnection.oniceconnectionstatechange = () => {
        if (this.peerConnection && this.peerConnection.iceConnectionState) {
          console.log('[MockWebRTC] ICE 连接状态:', this.peerConnection.iceConnectionState);
          
          // 处理连接失败的情况
          if (this.peerConnection.iceConnectionState === 'failed') {
            console.error('[MockWebRTC] ICE 连接失败');
            this.close();
          }
        }
      };
      
      this.peerConnection.onsignalingstatechange = () => {
        if (this.peerConnection) {
          console.log('[MockWebRTC] 信令状态:', this.peerConnection.signalingState);
        }
      };
      
      this.peerConnection.ontrack = (event) => {
        console.log('[MockWebRTC] 收到远程音频流（模拟）');
        if (event.streams && event.streams[0]) {
          this.remoteStream = event.streams[0];
          console.log('[MockWebRTC] 远程音频流ID:', this.remoteStream.id);
        }
      };
      
      console.log('[MockWebRTC] PeerConnection 创建成功（模拟）');
      return this.peerConnection;
      
    } catch (error) {
      console.error('[MockWebRTC] 创建 PeerConnection 失败:', error);
      throw error;
    }
  }
  
  /**
   * 创建 Offer（模拟）
   */
  async createOffer(callerId, calleeId) {
    try {
      console.log('[MockWebRTC] 创建 Offer（模拟）...');
      
      if (!this.peerConnection) {
        this.createPeerConnection(callerId, calleeId, true);
      }
      
      // 模拟 Offer 创建
      const offer = {
        type: 'offer',
        sdp: 'mock-sdp-offer'
      };
      
      console.log('[MockWebRTC] Offer 创建成功，发送给对方（模拟）...');
      
      // 通过 WebSocket 发送 Offer
      if (this.socket) {
        console.log('[MockWebRTC] 发送 call_offer 信令:', {
          from: callerId,
          to: calleeId,
          socketConnected: this.socket.connected,
          socketId: this.socket.id
        });
        
        this.socket.emit('call_offer', {
          from: callerId,
          to: calleeId,
          offer: offer,
          caller: {
            id: callerId,
          }
        });
      } else {
        console.error('[MockWebRTC] Socket 未连接，无法发送 call_offer');
      }
      
      return offer;
    } catch (error) {
      console.error('[MockWebRTC] 创建 Offer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理 Offer 并创建 Answer（模拟）
   */
  async handleOffer(callerId, calleeId, offer) {
    try {
      console.log('[MockWebRTC] 处理 Offer（模拟）...');
      
      if (!this.peerConnection) {
        this.createPeerConnection(callerId, calleeId, false);
      }
      
      console.log('[MockWebRTC] 远程描述已设置（模拟）');
      
      // 模拟 Answer 创建
      const answer = {
        type: 'answer',
        sdp: 'mock-sdp-answer'
      };
      
      console.log('[MockWebRTC] Answer 创建成功，发送给对方（模拟）...');
      
      // 通过 WebSocket 发送 Answer
      if (this.socket) {
        this.socket.emit('call_answer', {
          from: calleeId,
          to: callerId,
          answer: answer,
        });
      }
      
      return answer;
    } catch (error) {
      console.error('[MockWebRTC] 处理 Offer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理 Answer（模拟）
   */
  async handleAnswer(answer) {
    try {
      console.log('[MockWebRTC] 处理 Answer（模拟）...');
      
      console.log('[MockWebRTC] Answer 处理成功，P2P 连接建立中（模拟）...');
      
      // 模拟连接成功
      setTimeout(() => {
        if (this.peerConnection) {
          this.peerConnection.iceConnectionState = 'connected';
          this.isConnected = true;
          this.peerConnection.oniceconnectionstatechange();
        }
      }, 1000);
      
    } catch (error) {
      console.error('[MockWebRTC] 处理 Answer 失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加 ICE 候选者（模拟）
   */
  async addIceCandidate(candidate) {
    try {
      console.log('[MockWebRTC] 添加 ICE 候选者（模拟）...');
      
      if (this.peerConnection && this.peerConnection.signalingState !== 'closed') {
        console.log('[MockWebRTC] ICE 候选者添加成功（模拟）');
      } else {
        console.warn('[MockWebRTC] PeerConnection 不存在或已关闭，无法添加 ICE 候选者');
      }
    } catch (error) {
      console.error('[MockWebRTC] 添加 ICE 候选者失败:', error);
    }
  }
  
  /**
   * 切换静音（模拟）
   */
  toggleMute(muted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !muted;
      });
      console.log('[MockWebRTC] 静音状态:', muted ? '已静音' : '未静音');
    }
  }
  
  /**
   * 获取远程音频流（模拟）
   */
  getRemoteStream() {
    return this.remoteStream;
  }
  
  /**
   * 关闭连接（模拟）
   */
  close() {
    try {
      console.log('[MockWebRTC] 关闭连接（模拟）...');
      
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
      this.isConnected = false;
      console.log('[MockWebRTC] 连接已关闭（模拟）');
      
    } catch (error) {
      console.error('[MockWebRTC] 关闭连接失败:', error);
    }
  }
}

// 导出单例
export default new MockWebRTCService();
