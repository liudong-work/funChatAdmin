import express from 'express';
import { Feedback, User } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { uploadToOSS, deleteFromOSS, checkOSSConfig } from '../services/ossService.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import jwt from 'jsonwebtoken';
import { config } from '../config/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = express.Router();

// 管理员认证中间件
const adminAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      status: false,
      message: '管理员认证失败：缺少访问令牌'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // 这里可以添加管理员权限检查
    // 暂时允许所有认证用户访问管理员接口
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({
      status: false,
      message: '管理员认证失败：无效的访问令牌'
    });
  }
};

// 配置图片上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/feedback');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'feedback-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('只支持图片格式: jpeg, jpg, png, gif, webp'));
    }
  }
});

// 提交用户反馈
router.post('/submit', authenticateToken, upload.array('images', 5), async (req, res) => {
  try {
    const { type, content, contact, device_info, app_version } = req.body;
    const userId = req.user.id;
    const userUuid = req.user.uuid;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        status: false,
        message: '反馈内容不能为空'
      });
    }

    // 处理上传的图片
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      const ossAvailable = checkOSSConfig();
      
      for (const file of req.files) {
        if (ossAvailable) {
          try {
            // 上传到OSS
            const objectName = `feedback/${Date.now()}-${Math.random().toString(36).substr(2, 9)}${path.extname(file.originalname)}`;
            const ossResult = await uploadToOSS(file.path, objectName);
            
            if (ossResult.success) {
              imageUrls.push(ossResult.url);
              // 删除本地文件
              fs.unlinkSync(file.path);
            } else {
              // OSS上传失败，使用本地路径
              imageUrls.push(`/uploads/feedback/${file.filename}`);
            }
          } catch (error) {
            console.error('OSS上传失败:', error);
            imageUrls.push(`/uploads/feedback/${file.filename}`);
          }
        } else {
          // OSS未配置，使用本地路径
          imageUrls.push(`/uploads/feedback/${file.filename}`);
        }
      }
    }

    // 创建反馈记录
    const feedbackUuid = `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const feedback = await Feedback.create({
      uuid: feedbackUuid,
      user_id: userId,
      user_uuid: userUuid,
      type: type || 'other',
      content: content.trim(),
      images: imageUrls,
      contact: contact || null,
      device_info: device_info ? JSON.parse(device_info) : null,
      app_version: app_version || '1.0.0',
      status: 'pending'
    });

    console.log(`✅ 用户反馈创建成功: ${feedbackUuid}`);

    return res.status(200).json({
      status: true,
      message: '感谢您的反馈，我们会尽快处理',
      data: {
        uuid: feedback.uuid,
        created_at: feedback.created_at
      }
    });
  } catch (error) {
    console.error('提交反馈失败:', error);
    return res.status(500).json({
      status: false,
      message: '提交反馈失败，请稍后重试'
    });
  }
});

// 获取用户自己的反馈列表
router.get('/my-feedbacks', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, pageSize = 10 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const { count, rows } = await Feedback.findAndCountAll({
      where: { user_id: userId },
      attributes: ['uuid', 'type', 'content', 'images', 'status', 'reply', 'replied_at', 'created_at'],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: {
        feedbacks: rows,
        total: count,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取反馈列表失败'
    });
  }
});

// ========== 管理员API ==========

// 获取所有反馈列表（管理员）
router.get('/admin/list', adminAuth, async (req, res) => {
  try {
    const { page = 1, pageSize = 20, status, type, keyword } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    const limit = parseInt(pageSize);

    const where = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const { count, rows } = await Feedback.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['uuid', 'nickname', 'phone', 'avatar']
        }
      ],
      order: [['created_at', 'DESC']],
      offset,
      limit
    });

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: {
        feedbacks: rows,
        total: count,
        page: parseInt(page),
        pageSize: limit,
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('获取反馈列表失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取反馈列表失败'
    });
  }
});

// 获取反馈详情（管理员）
router.get('/admin/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;

    const feedback = await Feedback.findOne({
      where: { uuid },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['uuid', 'nickname', 'phone', 'email', 'avatar']
        }
      ]
    });

    if (!feedback) {
      return res.status(404).json({
        status: false,
        message: '反馈不存在'
      });
    }

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: feedback
    });
  } catch (error) {
    console.error('获取反馈详情失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取反馈详情失败'
    });
  }
});

// 回复反馈（管理员）
router.post('/admin/reply/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { reply, status } = req.body;
    const adminId = req.user.id;

    if (!reply || reply.trim() === '') {
      return res.status(400).json({
        status: false,
        message: '回复内容不能为空'
      });
    }

    const feedback = await Feedback.findOne({ where: { uuid } });

    if (!feedback) {
      return res.status(404).json({
        status: false,
        message: '反馈不存在'
      });
    }

    await feedback.update({
      reply: reply.trim(),
      status: status || 'processing',
      admin_id: adminId,
      replied_at: new Date()
    });

    console.log(`✅ 管理员回复反馈成功: ${uuid}`);

    return res.status(200).json({
      status: true,
      message: '回复成功',
      data: feedback
    });
  } catch (error) {
    console.error('回复反馈失败:', error);
    return res.status(500).json({
      status: false,
      message: '回复反馈失败'
    });
  }
});

// 更新反馈状态（管理员）
router.put('/admin/status/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.body;

    if (!['pending', 'processing', 'resolved', 'closed'].includes(status)) {
      return res.status(400).json({
        status: false,
        message: '无效的状态值'
      });
    }

    const feedback = await Feedback.findOne({ where: { uuid } });

    if (!feedback) {
      return res.status(404).json({
        status: false,
        message: '反馈不存在'
      });
    }

    await feedback.update({ status });

    console.log(`✅ 反馈状态更新成功: ${uuid} -> ${status}`);

    return res.status(200).json({
      status: true,
      message: '状态更新成功',
      data: feedback
    });
  } catch (error) {
    console.error('更新反馈状态失败:', error);
    return res.status(500).json({
      status: false,
      message: '更新反馈状态失败'
    });
  }
});

// 删除反馈（管理员）
router.delete('/admin/:uuid', adminAuth, async (req, res) => {
  try {
    const { uuid } = req.params;

    const feedback = await Feedback.findOne({ where: { uuid } });

    if (!feedback) {
      return res.status(404).json({
        status: false,
        message: '反馈不存在'
      });
    }

    // 删除关联的图片
    if (feedback.images && feedback.images.length > 0) {
      const ossAvailable = checkOSSConfig();
      
      for (const imageUrl of feedback.images) {
        if (imageUrl.startsWith('http')) {
          // OSS图片
          if (ossAvailable) {
            try {
              await deleteFromOSS(imageUrl);
            } catch (error) {
              console.error('删除OSS图片失败:', error);
            }
          }
        } else {
          // 本地图片
          const imagePath = path.join(__dirname, '../../', imageUrl);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      }
    }

    await feedback.destroy();

    console.log(`✅ 反馈删除成功: ${uuid}`);

    return res.status(200).json({
      status: true,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除反馈失败:', error);
    return res.status(500).json({
      status: false,
      message: '删除反馈失败'
    });
  }
});

// 获取反馈统计（管理员）
router.get('/admin/stats', adminAuth, async (req, res) => {
  try {
    const total = await Feedback.count();
    const pending = await Feedback.count({ where: { status: 'pending' } });
    const processing = await Feedback.count({ where: { status: 'processing' } });
    const resolved = await Feedback.count({ where: { status: 'resolved' } });
    const closed = await Feedback.count({ where: { status: 'closed' } });

    const bugCount = await Feedback.count({ where: { type: 'bug' } });
    const featureCount = await Feedback.count({ where: { type: 'feature' } });
    const complaintCount = await Feedback.count({ where: { type: 'complaint' } });
    const otherCount = await Feedback.count({ where: { type: 'other' } });

    return res.status(200).json({
      status: true,
      message: '获取成功',
      data: {
        total,
        byStatus: {
          pending,
          processing,
          resolved,
          closed
        },
        byType: {
          bug: bugCount,
          feature: featureCount,
          complaint: complaintCount,
          other: otherCount
        }
      }
    });
  } catch (error) {
    console.error('获取反馈统计失败:', error);
    return res.status(500).json({
      status: false,
      message: '获取反馈统计失败'
    });
  }
});

export default router;

