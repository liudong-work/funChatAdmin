import express from 'express';
import jwt from 'jsonwebtoken';
import { BottleConfig } from '../models/index.js';
import { log } from '../config/logger.js';
import { config } from '../config/config.js';

const router = express.Router();

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ status: false, message: '访问令牌无效' });
  }

  try {
    // 验证JWT token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 检查是否是管理员token
    if (decoded.type === 'admin') {
      req.admin = { id: decoded.id, username: decoded.username };
      next();
    } else {
      return res.status(403).json({ status: false, message: '管理员权限不足' });
    }
  } catch (error) {
    log.error('管理员认证失败:', error);
    return res.status(401).json({ status: false, message: '访问令牌无效' });
  }
};

// 获取所有配置
router.get('/api/admin/bottle-configs', adminAuth, async (req, res) => {
  try {
    const configs = await BottleConfig.findAll({
      order: [['created_at', 'DESC']]
    });

    log.info('[BottleConfig] 获取配置列表成功');
    res.json({
      status: true,
      message: '获取成功',
      data: configs
    });
  } catch (error) {
    log.error('[BottleConfig] 获取配置列表失败:', error);
    res.status(500).json({
      status: false,
      message: '获取配置列表失败'
    });
  }
});

// 获取单个配置
router.get('/api/admin/bottle-configs/:key', adminAuth, async (req, res) => {
  try {
    const { key } = req.params;
    const config = await BottleConfig.findOne({
      where: { key }
    });

    if (!config) {
      return res.status(404).json({
        status: false,
        message: '配置不存在'
      });
    }

    log.info(`[BottleConfig] 获取配置成功: ${key}`);
    res.json({
      status: true,
      message: '获取成功',
      data: config
    });
  } catch (error) {
    log.error('[BottleConfig] 获取配置失败:', error);
    res.status(500).json({
      status: false,
      message: '获取配置失败'
    });
  }
});

// 创建或更新配置
router.post('/api/admin/bottle-configs', adminAuth, async (req, res) => {
  try {
    const { key, value, description, type = 'string', is_active = true } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({
        status: false,
        message: '配置键名和值不能为空'
      });
    }

    // 检查配置是否已存在
    const existingConfig = await BottleConfig.findOne({
      where: { key }
    });

    let config;
    if (existingConfig) {
      // 更新现有配置
      await existingConfig.update({
        value: String(value),
        description,
        type,
        is_active
      });
      config = existingConfig;
      log.info(`[BottleConfig] 更新配置成功: ${key}`);
    } else {
      // 创建新配置
      config = await BottleConfig.create({
        key,
        value: String(value),
        description,
        type,
        is_active
      });
      log.info(`[BottleConfig] 创建配置成功: ${key}`);
    }

    res.json({
      status: true,
      message: existingConfig ? '更新成功' : '创建成功',
      data: config
    });
  } catch (error) {
    log.error('[BottleConfig] 创建/更新配置失败:', error);
    res.status(500).json({
      status: false,
      message: '创建/更新配置失败'
    });
  }
});

// 更新配置
router.put('/api/admin/bottle-configs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { value, description, type, is_active } = req.body;

    const config = await BottleConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({
        status: false,
        message: '配置不存在'
      });
    }

    const updateData = {};
    if (value !== undefined) updateData.value = String(value);
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (is_active !== undefined) updateData.is_active = is_active;

    await config.update(updateData);

    log.info(`[BottleConfig] 更新配置成功: ${config.key}`);
    res.json({
      status: true,
      message: '更新成功',
      data: config
    });
  } catch (error) {
    log.error('[BottleConfig] 更新配置失败:', error);
    res.status(500).json({
      status: false,
      message: '更新配置失败'
    });
  }
});

// 删除配置
router.delete('/api/admin/bottle-configs/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const config = await BottleConfig.findByPk(id);
    if (!config) {
      return res.status(404).json({
        status: false,
        message: '配置不存在'
      });
    }

    await config.destroy();

    log.info(`[BottleConfig] 删除配置成功: ${config.key}`);
    res.json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    log.error('[BottleConfig] 删除配置失败:', error);
    res.status(500).json({
      status: false,
      message: '删除配置失败'
    });
  }
});

// 获取免费捞瓶子次数配置（公开接口）
router.get('/api/bottle-configs/free-fish-count', async (req, res) => {
  try {
    const { gender } = req.query;
    
    // 根据性别获取不同的配置
    let configKey = 'free_fish_count';
    if (gender === 'male') {
      configKey = 'free_fish_count_male';
    } else if (gender === 'female') {
      configKey = 'free_fish_count_female';
    }

    const config = await BottleConfig.findOne({
      where: { 
        key: configKey,
        is_active: true 
      }
    });

    // 如果没有找到特定性别的配置，使用通用配置
    let freeFishCount = config ? parseInt(config.value) || 3 : null;
    
    if (freeFishCount === null) {
      const generalConfig = await BottleConfig.findOne({
        where: { key: 'free_fish_count', is_active: true }
      });
      freeFishCount = generalConfig ? parseInt(generalConfig.value) || 3 : 3; // 默认3次
    }

    res.json({
      status: true,
      message: '获取成功',
      data: {
        free_fish_count: freeFishCount,
        gender: gender || 'general',
        config_key: configKey
      }
    });
  } catch (error) {
    log.error('[BottleConfig] 获取免费捞瓶子次数失败:', error);
    res.status(500).json({
      status: false,
      message: '获取免费捞瓶子次数失败'
    });
  }
});

// 获取免费扔瓶子次数配置（公开接口）
router.get('/api/bottle-configs/free-throw-count', async (req, res) => {
  try {
    const { gender } = req.query;
    
    // 根据性别获取不同的配置
    let configKey = 'free_throw_count';
    if (gender === 'male') {
      configKey = 'free_throw_count_male';
    } else if (gender === 'female') {
      configKey = 'free_throw_count_female';
    }

    const config = await BottleConfig.findOne({
      where: { 
        key: configKey,
        is_active: true 
      }
    });

    // 如果没有找到特定性别的配置，使用通用配置
    let freeThrowCount = config ? parseInt(config.value) || 5 : null;
    
    if (freeThrowCount === null) {
      const generalConfig = await BottleConfig.findOne({
        where: { key: 'free_throw_count', is_active: true }
      });
      freeThrowCount = generalConfig ? parseInt(generalConfig.value) || 5 : 5; // 默认5次
    }

    res.json({
      status: true,
      message: '获取成功',
      data: {
        free_throw_count: freeThrowCount,
        gender: gender || 'general',
        config_key: configKey
      }
    });
  } catch (error) {
    log.error('[BottleConfig] 获取免费扔瓶子次数失败:', error);
    res.status(500).json({
      status: false,
      message: '获取免费扔瓶子次数失败'
    });
  }
});

export default router;
