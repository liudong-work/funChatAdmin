import Moment from '../models/Moment.js';
import User from '../models/User.js';
import { log } from '../config/logger.js';

class MomentService {
  /**
   * 创建动态
   * @param {Object} momentData - 动态数据
   * @returns {Promise<Object>} 创建的动态
   */
  async createMoment(momentData) {
    try {
      const { user_id, content, images = [], privacy = 'public' } = momentData;
      
      // 生成唯一UUID
      const uuid = `moment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const moment = await Moment.create({
        uuid,
        user_id,
        content,
        images,
        privacy,
        status: 'pending' // 默认待审核状态
      });

      log.info(`动态创建成功: ${uuid} (用户: ${user_id})`);
      return moment;
    } catch (error) {
      log.error('创建动态失败:', error);
      throw error;
    }
  }

  /**
   * 获取动态列表
   * @param {Object} options - 查询选项
   * @returns {Promise<Object>} 动态列表
   */
  async getMoments(options = {}) {
    try {
      const { 
        page = 1, 
        pageSize = 10, 
        status, 
        user_id,
        privacy 
      } = options;

      const offset = (page - 1) * pageSize;
      const limit = parseInt(pageSize);

      // 构建查询条件
      const where = {};
      if (status) where.status = status;
      if (user_id) where.user_id = user_id;
      if (privacy) where.privacy = privacy;

      const { count, rows } = await Moment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'nickname', 'avatar', 'phone']
          }
        ],
        order: [['created_at', 'DESC']],
        offset,
        limit
      });

      return {
        list: rows,
        total: count,
        page,
        pageSize,
        totalPages: Math.ceil(count / pageSize)
      };
    } catch (error) {
      log.error('获取动态列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个动态详情
   * @param {string} uuid - 动态UUID
   * @returns {Promise<Object>} 动态详情
   */
  async getMomentByUuid(uuid) {
    try {
      const moment = await Moment.findOne({
        where: { uuid },
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'nickname', 'avatar', 'phone']
          }
        ]
      });

      if (!moment) {
        throw new Error('动态不存在');
      }

      return moment;
    } catch (error) {
      log.error('获取动态详情失败:', error);
      throw error;
    }
  }

  /**
   * 审核动态
   * @param {string} uuid - 动态UUID
   * @param {string} status - 审核状态 (approved/rejected)
   * @param {string} reviewComment - 审核备注
   * @param {number} reviewerId - 审核人ID
   * @returns {Promise<Object>} 更新后的动态
   */
  async reviewMoment(uuid, status, reviewComment = '', reviewerId) {
    try {
      const moment = await Moment.findOne({ where: { uuid } });
      
      if (!moment) {
        throw new Error('动态不存在');
      }

      if (moment.status !== 'pending') {
        throw new Error('该动态已经审核过了');
      }

      await moment.update({
        status,
        review_comment: reviewComment,
        reviewed_by: reviewerId,
        reviewed_at: new Date()
      });

      log.info(`动态审核完成: ${uuid}, 状态: ${status}, 审核人: ${reviewerId}`);
      return moment;
    } catch (error) {
      log.error('审核动态失败:', error);
      throw error;
    }
  }

  /**
   * 删除动态
   * @param {string} uuid - 动态UUID
   * @param {number} userId - 用户ID
   * @returns {Promise<boolean>} 删除结果
   */
  async deleteMoment(uuid, userId) {
    try {
      const moment = await Moment.findOne({ 
        where: { uuid, user_id: userId } 
      });
      
      if (!moment) {
        throw new Error('动态不存在或无权限删除');
      }

      await moment.destroy();
      log.info(`动态删除成功: ${uuid}`);
      return true;
    } catch (error) {
      log.error('删除动态失败:', error);
      throw error;
    }
  }

  /**
   * 点赞动态
   * @param {string} uuid - 动态UUID
   * @param {number} userId - 用户ID
   * @returns {Promise<Object>} 点赞结果
   */
  async likeMoment(uuid, userId) {
    try {
      const moment = await Moment.findOne({ where: { uuid } });
      
      if (!moment) {
        throw new Error('动态不存在');
      }

      // 这里应该检查用户是否已经点赞过
      // 简化处理，直接增加点赞数
      await moment.increment('likes_count');
      
      log.info(`动态点赞: ${uuid}, 用户: ${userId}`);
      return { success: true, likesCount: moment.likes_count + 1 };
    } catch (error) {
      log.error('点赞动态失败:', error);
      throw error;
    }
  }
}

export default new MomentService();
