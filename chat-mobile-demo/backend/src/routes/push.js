import express from 'express';
import pushService from '../services/pushService.js';
import { authenticateToken } from '../middleware/auth.js';
import { log } from '../config/logger.js';

const router = express.Router();

/**
 * 注册推送Token
 * POST /api/push/register-token
 */
router.post('/register-token', authenticateToken, async (req, res) => {
  try {
    const { user_uuid, push_token, platform, device_info } = req.body;

    if (!user_uuid || !push_token) {
      return res.status(400).json({
        status: false,
        message: '缺少必要参数',
      });
    }

    // 验证是否是当前登录用户
    if (req.user.uuid !== user_uuid) {
      return res.status(403).json({
        status: false,
        message: '无权限',
      });
    }

    const result = pushService.registerToken(user_uuid, push_token, platform, device_info);

    if (result.success) {
      res.json({
        status: true,
        message: '推送Token注册成功',
      });
    } else {
      res.status(400).json({
        status: false,
        message: result.error || '推送Token注册失败',
      });
    }
  } catch (error) {
    log.error('[推送API] 注册Token失败:', error);
    res.status(500).json({
      status: false,
      message: '服务器错误',
    });
  }
});

/**
 * 发送测试推送通知
 * POST /api/push/test
 */
router.post('/test', authenticateToken, async (req, res) => {
  try {
    const { title, body, data } = req.body;
    const userUuid = req.user.uuid;

    const result = await pushService.sendPushNotification(userUuid, {
      title: title || '测试通知',
      body: body || '这是一条测试推送通知',
      data: data || { type: 'test' },
    });

    if (result.success) {
      res.json({
        status: true,
        message: '测试推送发送成功',
        data: result,
      });
    } else {
      res.status(400).json({
        status: false,
        message: result.error || '推送发送失败',
      });
    }
  } catch (error) {
    log.error('[推送API] 发送测试推送失败:', error);
    res.status(500).json({
      status: false,
      message: '服务器错误',
    });
  }
});

/**
 * 删除推送Token
 * DELETE /api/push/token
 */
router.delete('/token', authenticateToken, async (req, res) => {
  try {
    const userUuid = req.user.uuid;
    pushService.removeToken(userUuid);

    res.json({
      status: true,
      message: '推送Token已删除',
    });
  } catch (error) {
    log.error('[推送API] 删除Token失败:', error);
    res.status(500).json({
      status: false,
      message: '服务器错误',
    });
  }
});

/**
 * 获取推送统计信息（管理员）
 * GET /api/push/stats
 */
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    // 简单验证：检查是否是管理员（实际项目中应有更严格的权限控制）
    if (req.user.type !== 'admin') {
      return res.status(403).json({
        status: false,
        message: '无权限',
      });
    }

    const stats = {
      total_tokens: pushService.getTokenCount(),
      registered_users: pushService.getRegisteredUsers().length,
    };

    res.json({
      status: true,
      data: stats,
    });
  } catch (error) {
    log.error('[推送API] 获取统计信息失败:', error);
    res.status(500).json({
      status: false,
      message: '服务器错误',
    });
  }
});

export default router;

