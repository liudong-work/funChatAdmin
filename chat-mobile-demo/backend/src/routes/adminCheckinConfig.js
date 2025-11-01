import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { CheckinConfig } from '../models/index.js';
import { log } from '../config/logger.js';

const router = express.Router();

// ========== 签到配置管理API ==========

// 获取所有签到配置
router.get('/checkin-configs', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        status: false, 
        message: '权限不足，需要管理员权限' 
      });
    }

    const configs = await CheckinConfig.findAll({
      order: [['continuous_days', 'ASC']]
    });

    return res.status(200).json({
      status: true,
      data: configs
    });
  } catch (error) {
    log.error('获取签到配置失败:', error);
    return res.status(500).json({ 
      status: false, 
      message: '获取签到配置失败' 
    });
  }
});

// 更新签到配置
router.put('/checkin-configs/:id', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        status: false, 
        message: '权限不足，需要管理员权限' 
      });
    }

    const { id } = req.params;
    const { coins_reward, is_active, description } = req.body;

    const config = await CheckinConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({ 
        status: false, 
        message: '签到配置不存在' 
      });
    }

    await config.update({
      coins_reward,
      is_active,
      description,
      updated_at: new Date()
    });

    log.info(`[ADMIN] 更新签到配置: 连续${config.continuous_days}天 -> ${coins_reward}金币`);

    return res.status(200).json({
      status: true,
      message: '签到配置更新成功',
      data: config
    });
  } catch (error) {
    log.error('更新签到配置失败:', error);
    return res.status(500).json({ 
      status: false, 
      message: '更新签到配置失败' 
    });
  }
});

// 批量更新签到配置
router.put('/checkin-configs/batch', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        status: false, 
        message: '权限不足，需要管理员权限' 
      });
    }

    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return res.status(400).json({ 
        status: false, 
        message: '配置数据格式错误' 
      });
    }

    const updatePromises = configs.map(async (config) => {
      const { id, coins_reward, is_active, description } = config;
      const existingConfig = await CheckinConfig.findByPk(id);
      
      if (existingConfig) {
        return existingConfig.update({
          coins_reward,
          is_active,
          description,
          updated_at: new Date()
        });
      }
      return null;
    });

    await Promise.all(updatePromises);

    log.info(`[ADMIN] 批量更新签到配置: ${configs.length}个配置`);

    return res.status(200).json({
      status: true,
      message: '签到配置批量更新成功'
    });
  } catch (error) {
    log.error('批量更新签到配置失败:', error);
    return res.status(500).json({ 
      status: false, 
      message: '批量更新签到配置失败' 
    });
  }
});

// 初始化默认签到配置
router.post('/checkin-configs/init', authenticateToken, async (req, res) => {
  try {
    // 检查管理员权限
    if (req.user.type !== 'admin') {
      return res.status(403).json({ 
        status: false, 
        message: '权限不足，需要管理员权限' 
      });
    }

    const defaultConfigs = [
      { continuous_days: 1, coins_reward: 10, description: '第1天签到' },
      { continuous_days: 2, coins_reward: 15, description: '第2天签到' },
      { continuous_days: 3, coins_reward: 20, description: '第3天签到' },
      { continuous_days: 4, coins_reward: 25, description: '第4天签到' },
      { continuous_days: 5, coins_reward: 30, description: '第5天签到' },
      { continuous_days: 6, coins_reward: 35, description: '第6天签到' },
      { continuous_days: 7, coins_reward: 50, description: '第7天签到' }
    ];

    // 检查是否已存在配置
    const existingConfigs = await CheckinConfig.findAll();
    if (existingConfigs.length > 0) {
      return res.status(400).json({ 
        status: false, 
        message: '签到配置已存在，请使用更新接口' 
      });
    }

    // 创建默认配置
    await CheckinConfig.bulkCreate(defaultConfigs);

    log.info('[ADMIN] 初始化默认签到配置成功');

    return res.status(200).json({
      status: true,
      message: '默认签到配置初始化成功',
      data: defaultConfigs
    });
  } catch (error) {
    log.error('初始化签到配置失败:', error);
    return res.status(500).json({ 
      status: false, 
      message: '初始化签到配置失败' 
    });
  }
});

export default router;
