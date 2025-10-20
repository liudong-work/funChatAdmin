import { Expo } from 'expo-server-sdk';
import { log } from '../config/logger.js';

class PushService {
  constructor() {
    this.expo = new Expo();
    this.pushTokens = new Map(); // 存储用户的推送Token
    log.info('[推送服务] 初始化完成');
  }

  /**
   * 注册用户的推送Token
   */
  registerToken(userUuid, pushToken, platform, deviceInfo) {
    try {
      // 验证Token格式
      if (!Expo.isExpoPushToken(pushToken)) {
        log.warn(`[推送服务] 无效的推送Token: ${pushToken}`);
        return { success: false, error: 'Invalid push token format' };
      }

      this.pushTokens.set(userUuid, {
        token: pushToken,
        platform,
        deviceInfo,
        registeredAt: new Date().toISOString(),
      });

      log.info(`[推送服务] 用户 ${userUuid} 的推送Token已注册 (平台: ${platform})`);
      return { success: true, message: 'Token registered successfully' };
    } catch (error) {
      log.error('[推送服务] 注册Token失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 获取用户的推送Token
   */
  getToken(userUuid) {
    return this.pushTokens.get(userUuid);
  }

  /**
   * 删除用户的推送Token
   */
  removeToken(userUuid) {
    this.pushTokens.delete(userUuid);
    log.info(`[推送服务] 用户 ${userUuid} 的推送Token已删除`);
  }

  /**
   * 发送推送通知
   */
  async sendPushNotification(userUuid, notification) {
    try {
      const tokenData = this.pushTokens.get(userUuid);
      if (!tokenData) {
        log.warn(`[推送服务] 用户 ${userUuid} 没有注册推送Token`);
        return { success: false, error: 'No push token registered' };
      }

      const message = {
        to: tokenData.token,
        sound: 'default',
        title: notification.title,
        body: notification.body,
        data: notification.data || {},
        badge: notification.badge || 1,
        priority: 'high',
        channelId: 'default',
        // iOS specific
        _displayInForeground: true,
      };

      log.info(`[推送服务] 准备发送推送给用户 ${userUuid}: ${notification.title}`);

      // 批量发送（这里只发送一个，但API支持批量）
      const chunks = this.expo.chunkPushNotifications([message]);
      const tickets = [];

      for (const chunk of chunks) {
        try {
          const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
          tickets.push(...ticketChunk);
          log.info(`[推送服务] 推送已发送，收到 ${ticketChunk.length} 个票据`);
        } catch (error) {
          log.error('[推送服务] 发送推送失败:', error);
        }
      }

      // 检查发送结果
      for (const ticket of tickets) {
        if (ticket.status === 'error') {
          log.error(`[推送服务] 推送错误: ${ticket.message}`);
          if (ticket.details && ticket.details.error === 'DeviceNotRegistered') {
            // Token 已失效，从数据库删除
            log.warn(`[推送服务] Token已失效，删除用户 ${userUuid} 的Token`);
            this.pushTokens.delete(userUuid);
          }
          return { success: false, error: ticket.message, tickets };
        } else {
          log.info(`[推送服务] 推送发送成功，票据ID: ${ticket.id}`);
        }
      }

      return { success: true, tickets };
    } catch (error) {
      log.error('[推送服务] 发送推送通知失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 发送新消息通知
   */
  async sendNewMessageNotification(receiverUuid, senderName, senderUuid, messagePreview, senderAvatar = '👤') {
    return await this.sendPushNotification(receiverUuid, {
      title: `${senderName} 发来新消息`,
      body: messagePreview,
      data: {
        type: 'new_message',
        sender_name: senderName,
        sender_uuid: senderUuid,
        sender_avatar: senderAvatar,
      },
    });
  }

  /**
   * 发送点赞通知
   */
  async sendLikeNotification(receiverUuid, likerName, likerUuid, momentUuid, momentContent) {
    const preview = momentContent.length > 30 ? momentContent.substring(0, 30) + '...' : momentContent;
    return await this.sendPushNotification(receiverUuid, {
      title: `${likerName} 赞了你的动态`,
      body: preview,
      data: {
        type: 'like',
        liker_name: likerName,
        liker_uuid: likerUuid,
        moment_uuid: momentUuid,
      },
    });
  }

  /**
   * 发送评论通知
   */
  async sendCommentNotification(receiverUuid, commenterName, commenterUuid, momentUuid, commentContent) {
    const preview = commentContent.length > 50 ? commentContent.substring(0, 50) + '...' : commentContent;
    return await this.sendPushNotification(receiverUuid, {
      title: `${commenterName} 评论了你`,
      body: preview,
      data: {
        type: 'comment',
        commenter_name: commenterName,
        commenter_uuid: commenterUuid,
        moment_uuid: momentUuid,
      },
    });
  }

  /**
   * 发送关注通知
   */
  async sendFollowNotification(receiverUuid, followerName, followerUuid) {
    return await this.sendPushNotification(receiverUuid, {
      title: '新关注',
      body: `${followerName} 关注了你`,
      data: {
        type: 'follow',
        follower_name: followerName,
        follower_uuid: followerUuid,
      },
    });
  }

  /**
   * 发送系统通知
   */
  async sendSystemNotification(userUuid, title, body, data = {}) {
    return await this.sendPushNotification(userUuid, {
      title,
      body,
      data: {
        type: 'system',
        ...data,
      },
    });
  }

  /**
   * 批量发送推送
   */
  async sendBatchNotifications(userUuids, notification) {
    const results = [];
    for (const userUuid of userUuids) {
      const result = await this.sendPushNotification(userUuid, notification);
      results.push({ userUuid, ...result });
    }
    return results;
  }

  /**
   * 获取所有注册的Token数量
   */
  getTokenCount() {
    return this.pushTokens.size;
  }

  /**
   * 获取所有注册的用户UUID列表
   */
  getRegisteredUsers() {
    return Array.from(this.pushTokens.keys());
  }
}

// 导出单例
export default new PushService();

