import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import apiService from './apiService';

// 配置通知处理行为
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,    // 显示弹窗
    shouldPlaySound: true,    // 播放声音
    shouldSetBadge: true,     // 显示角标
  }),
});

class NotificationService {
  constructor() {
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * 请求通知权限
   */
  async requestPermissions() {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.warn('[推送] 通知权限未授予');
        return false;
      }
      
      console.log('[推送] 通知权限已授予');
      return true;
    } catch (error) {
      console.error('[推送] 请求权限失败:', error);
      return false;
    }
  }

  /**
   * 获取 Expo Push Token
   */
  async getExpoPushToken() {
    try {
      // 检查是否是真机
      if (!Device.isDevice) {
        console.warn('[推送] 推送通知仅在真机上可用');
        return null;
      }

      // 请求权限
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.warn('[推送] 通知权限未授予');
        return null;
      }

      // 获取 Token
      const projectId = Constants.expoConfig?.extra?.eas?.projectId;
      if (!projectId) {
        console.error('[推送] 缺少 EAS projectId，请检查 app.json 配置');
        return null;
      }

      console.log('[推送] 正在获取推送Token，项目ID:', projectId);

      // 添加重试机制
      let retries = 3;
      let lastError = null;

      while (retries > 0) {
        try {
          const token = await Notifications.getExpoPushTokenAsync({
            projectId,
          });

          console.log('[推送] Expo Push Token 获取成功:', token.data);
          return token.data;
        } catch (error) {
          lastError = error;
          retries--;
          console.warn(`[推送] 获取Token失败，剩余重试次数: ${retries}`, error.message);
          
          if (retries > 0) {
            // 等待2秒后重试
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }

      // 所有重试都失败了
      console.error('[推送] 获取推送Token失败，已重试3次:', lastError);
      
      // 提供更详细的错误信息
      if (lastError.message.includes('SERVICE_NOT_AVAILABLE')) {
        console.error('[推送] 服务不可用，可能的原因:');
        console.error('1. 网络连接问题');
        console.error('2. Google Play Services 未更新 (Android)');
        console.error('3. 设备时间不正确');
        console.error('4. 防火墙阻止了连接');
      }
      
      return null;
    } catch (error) {
      console.error('[推送] 获取推送Token失败:', error);
      return null;
    }
  }

  /**
   * 注册推送Token到后端
   */
  async registerPushToken(userUuid, pushToken) {
    try {
      const response = await apiService.post('/api/push/register-token', {
        user_uuid: userUuid,
        push_token: pushToken,
        platform: Platform.OS,
        device_info: {
          brand: Device.brand,
          model: Device.modelName,
          os: Device.osName,
          osVersion: Device.osVersion,
        },
      });
      
      console.log('[推送] Token注册成功');
      return response.data;
    } catch (error) {
      console.error('[推送] Token注册失败:', error);
      throw error;
    }
  }

  /**
   * 监听通知事件
   */
  setupNotificationListeners(navigation) {
    // 监听收到通知（前台）
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('[推送] 收到通知（前台）:', notification.request.content);
      // 可以在这里显示自定义UI或更新角标
    });

    // 监听用户点击通知
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[推送] 用户点击通知:', response.notification.request.content);
      
      const data = response.notification.request.content.data;
      
      // 根据通知类型跳转到对应页面
      if (!navigation || !data.type) {
        return;
      }

      try {
        switch (data.type) {
          case 'new_message':
            // 跳转到聊天详情
            if (data.sender_uuid && data.sender_name) {
              navigation.navigate('ChatDetail', {
                user: {
                  uuid: data.sender_uuid,
                  name: data.sender_name,
                  avatar: data.sender_avatar || '👤',
                }
              });
            }
            break;
          
          case 'like':
          case 'comment':
            // 跳转到动态详情
            if (data.moment_uuid) {
              navigation.navigate('MomentDetail', {
                moment: { uuid: data.moment_uuid }
              });
            }
            break;
          
          case 'follow':
            // 跳转到用户主页
            if (data.sender_uuid) {
              navigation.navigate('UserProfile', {
                userUuid: data.sender_uuid
              });
            }
            break;
          
          default:
            console.warn('[推送] 未知的通知类型:', data.type);
            break;
        }
      } catch (error) {
        console.error('[推送] 处理通知点击失败:', error);
      }
    });

    console.log('[推送] 通知监听器已设置');
  }

  /**
   * 清理监听器
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
      this.notificationListener = null;
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
      this.responseListener = null;
    }
    console.log('[推送] 通知监听器已清理');
  }

  /**
   * 显示本地通知（测试用）
   */
  async showLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: null, // 立即显示
      });
      console.log('[推送] 本地通知已发送');
    } catch (error) {
      console.error('[推送] 显示本地通知失败:', error);
    }
  }

  /**
   * 备用推送方案：使用本地通知
   * 当远程推送不可用时使用
   */
  async sendFallbackNotification(title, body, data = {}) {
    try {
      console.log('[推送] 使用备用本地通知方案');
      await this.showLocalNotification(title, body, data);
      return { success: true, method: 'local' };
    } catch (error) {
      console.error('[推送] 备用通知发送失败:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * 清除所有通知
   */
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      console.log('[推送] 所有通知已清除');
    } catch (error) {
      console.error('[推送] 清除通知失败:', error);
    }
  }

  /**
   * 设置角标数量
   */
  async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
      console.log('[推送] 角标数量已设置:', count);
    } catch (error) {
      console.error('[推送] 设置角标失败:', error);
    }
  }

  /**
   * 获取当前角标数量
   */
  async getBadgeCount() {
    try {
      return await Notifications.getBadgeCountAsync();
    } catch (error) {
      console.error('[推送] 获取角标失败:', error);
      return 0;
    }
  }

  /**
   * 增加角标数量
   */
  async incrementBadge() {
    try {
      const current = await this.getBadgeCount();
      await this.setBadgeCount(current + 1);
    } catch (error) {
      console.error('[推送] 增加角标失败:', error);
    }
  }

  /**
   * 清除角标
   */
  async clearBadge() {
    await this.setBadgeCount(0);
  }
}

export default new NotificationService();

