<template>
  <div class="moment-review">
    <a-page-header title="动态审核" sub-title="审核用户发布的动态内容" class="page-header" />
    
    <!-- 统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :span="6">
        <a-card>
          <a-statistic title="总动态数" :value="statistics.total" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="待审核" :value="statistics.pending" :value-style="{ color: '#faad14' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="已通过" :value="statistics.approved" :value-style="{ color: '#52c41a' }" />
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card>
          <a-statistic title="已拒绝" :value="statistics.rejected" :value-style="{ color: '#f5222d' }" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选器 -->
    <a-card class="filter-card" :bordered="false">
      <a-form layout="inline" :model="filterForm" @finish="handleFilter">
        <a-form-item label="状态筛选">
          <a-select v-model:value="filterForm.status" style="width: 120px" placeholder="全部状态">
            <a-select-option value="">全部状态</a-select-option>
            <a-select-option value="pending">待审核</a-select-option>
            <a-select-option value="approved">已通过</a-select-option>
            <a-select-option value="rejected">已拒绝</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="开始日期">
          <a-date-picker v-model:value="filterForm.startDate" placeholder="选择开始日期" />
        </a-form-item>
        <a-form-item label="结束日期">
          <a-date-picker v-model:value="filterForm.endDate" placeholder="选择结束日期" />
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :loading="loading">
              <template #icon><SearchOutlined /></template>
              筛选
            </a-button>
            <a-button @click="loadPendingMoments">
              <template #icon><ClockCircleOutlined /></template>
              待审核
            </a-button>
            <a-button @click="refreshData">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 动态列表 -->
    <a-card :bordered="false">
      <a-spin :spinning="loading">
        <a-list
          :data-source="moments"
          :pagination="pagination"
          item-layout="vertical"
          size="large"
        >
          <template #renderItem="{ item }">
            <a-list-item>
              <template #actions>
                <span class="action-link" @click="showDetailModal(item)">
                  <EyeOutlined /> 查看详情
                </span>
                <a-button 
                  v-if="item.status === 'pending'" 
                  type="primary" 
                  size="small"
                  @click="showReviewModal(item)"
                  class="review-button"
                >
                  <CheckCircleOutlined />
                  审核
                </a-button>
              </template>
              
              <a-list-item-meta>
                <template #title>
                  <a-space>
                    <span>{{ item.author.nickname }}</span>
                    <a-tag :color="getStatusColor(item.status)">
                      {{ item.statusText || getStatusText(item.status) }}
                    </a-tag>
                    <a-tag color="blue">
                      {{ getPrivacyText(item.privacy) }}
                    </a-tag>
                  </a-space>
                </template>
                <template #description>
                  <span>{{ formatDate(item.created_at) }}</span>
                </template>
              </a-list-item-meta>
              
              <div class="moment-content">
                {{ item.content }}
              </div>
              
              <div v-if="item.images && item.images.length > 0" class="moment-images">
                <a-image-preview-group>
                  <a-image
                    v-for="(image, index) in item.images"
                    :key="index"
                    :width="100"
                    :src="image"
                    :preview="true"
                  />
                </a-image-preview-group>
              </div>
              
              <div v-if="item.status !== 'pending'" class="review-info">
                <a-typography-text type="secondary">
                  审核时间: {{ item.reviewed_at ? formatDate(item.reviewed_at) : '-' }}
                  <span v-if="item.review_comment"> | 审核意见: {{ item.review_comment }}</span>
                </a-typography-text>
              </div>
            </a-list-item>
          </template>
        </a-list>
      </a-spin>
    </a-card>

    <!-- 审核模态框 -->
    <a-modal
      v-model:open="reviewModalVisible"
      title="审核动态"
      width="600px"
      @ok="handleReview"
      @cancel="closeReviewModal"
    >
      <div v-if="currentMoment">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="作者">{{ currentMoment.author.nickname }}</a-descriptions-item>
          <a-descriptions-item label="发布时间">{{ formatDate(currentMoment.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="隐私设置">{{ getPrivacyText(currentMoment.privacy) }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">
            <a-tag :color="getStatusColor(currentMoment.status)">
              {{ currentMoment.statusText || getStatusText(currentMoment.status) }}
            </a-tag>
          </a-descriptions-item>
        </a-descriptions>
        
        <div class="moment-detail-content">
          <h4>动态内容:</h4>
          <p>{{ currentMoment.content }}</p>
          
          <div v-if="currentMoment.images && currentMoment.images.length > 0" class="moment-detail-images">
            <h4>图片:</h4>
            <a-image-preview-group>
              <a-image
                v-for="(image, index) in currentMoment.images"
                :key="index"
                :width="120"
                :src="image"
                :preview="true"
              />
            </a-image-preview-group>
          </div>
        </div>
        
        <a-form-item label="审核意见">
          <a-textarea
            v-model:value="reviewForm.reviewComment"
            placeholder="请输入审核意见（可选）"
            :rows="3"
          />
        </a-form-item>
        
        <div class="review-actions">
          <a-button type="primary" danger @click="handleReview('rejected')" :loading="reviewing">
            拒绝
          </a-button>
          <a-button type="primary" @click="handleReview('approved')" :loading="reviewing">
            通过
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- 详情模态框 -->
    <a-modal
      v-model:open="detailModalVisible"
      title="动态详情"
      width="700px"
      :footer="null"
    >
      <div v-if="currentMoment">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="作者">{{ currentMoment.author.nickname }}</a-descriptions-item>
          <a-descriptions-item label="发布时间">{{ formatDate(currentMoment.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="隐私设置">{{ getPrivacyText(currentMoment.privacy) }}</a-descriptions-item>
          <a-descriptions-item label="当前状态">
            <a-tag :color="getStatusColor(currentMoment.status)">
              {{ currentMoment.statusText || getStatusText(currentMoment.status) }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="动态ID" :span="2">{{ currentMoment.uuid }}</a-descriptions-item>
        </a-descriptions>
        
        <div class="moment-detail-content">
          <h4>动态内容:</h4>
          <div class="content-text">{{ currentMoment.content }}</div>
          
          <div v-if="currentMoment.images && currentMoment.images.length > 0" class="moment-detail-images">
            <h4>图片 ({{ currentMoment.images.length }}张):</h4>
            <a-image-preview-group>
              <a-image
                v-for="(image, index) in currentMoment.images"
                :key="index"
                :width="150"
                :src="image"
                :preview="true"
                class="detail-image"
              />
            </a-image-preview-group>
          </div>

          <div v-if="currentMoment.status !== 'pending'" class="review-info-detail">
            <h4>审核信息:</h4>
            <p><strong>审核时间:</strong> {{ currentMoment.reviewed_at ? formatDate(currentMoment.reviewed_at) : '-' }}</p>
            <p v-if="currentMoment.review_comment"><strong>审核意见:</strong> {{ currentMoment.review_comment }}</p>
          </div>
        </div>
        
        <div class="detail-actions">
          <a-button @click="closeDetailModal">关闭</a-button>
          <a-button 
            v-if="currentMoment.status === 'pending'" 
            type="primary" 
            @click="showReviewModal(currentMoment)"
          >
            审核此动态
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { 
  SearchOutlined, 
  ClockCircleOutlined, 
  ReloadOutlined, 
  EyeOutlined, 
  CheckCircleOutlined 
} from '@ant-design/icons-vue'
import { 
  getPendingMoments, 
  getAllMoments, 
  getMomentStatistics, 
  reviewMoment,
  type Moment,
  type MomentStatistics,
  type MomentListParams
} from '@/api/moment'
import dayjs from 'dayjs'

// 响应式数据
const loading = ref(false)
const reviewing = ref(false)
const reviewModalVisible = ref(false)
const detailModalVisible = ref(false)
const currentMoment = ref<Moment | null>(null)

// 统计数据
const statistics = reactive<MomentStatistics>({
  total: 0,
  pending: 0,
  approved: 0,
  rejected: 0,
  today: 0,
  thisWeek: 0
})

// 动态列表
const moments = ref<Moment[]>([])

// 筛选表单
const filterForm = reactive<MomentListParams>({
  status: '',
  startDate: null,
  endDate: null
})

// 审核表单
const reviewForm = reactive({
  reviewComment: ''
})

// 分页配置
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  onChange: (page: number, pageSize: number) => {
    pagination.current = page
    pagination.pageSize = pageSize
    loadMoments()
  }
})

// 加载统计数据
const loadStatistics = async () => {
  try {
    const response = await getMomentStatistics()
    if (response.status) {
      Object.assign(statistics, response.data)
    }
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载动态列表
const loadMoments = async () => {
  loading.value = true
  try {
    const params: MomentListParams = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...filterForm
    }
    
    // 转换日期格式
    if (params.startDate) {
      params.startDate = dayjs(params.startDate).format('YYYY-MM-DD')
    }
    if (params.endDate) {
      params.endDate = dayjs(params.endDate).format('YYYY-MM-DD')
    }
    
    const response = await getAllMoments(params)
    if (response.status) {
      moments.value = response.data.list
      pagination.total = response.data.total
    }
  } catch (error) {
    console.error('加载动态列表失败:', error)
    message.error('加载动态列表失败')
  } finally {
    loading.value = false
  }
}

// 加载待审核动态
const loadPendingMoments = () => {
  filterForm.status = 'pending'
  filterForm.startDate = null
  filterForm.endDate = null
  pagination.current = 1
  loadMoments()
}

// 筛选处理
const handleFilter = () => {
  pagination.current = 1
  loadMoments()
}

// 刷新数据
const refreshData = () => {
  loadStatistics()
  loadMoments()
}

// 显示审核模态框
const showReviewModal = (moment: Moment) => {
  currentMoment.value = moment
  reviewForm.reviewComment = ''
  reviewModalVisible.value = true
}

// 关闭审核模态框
const closeReviewModal = () => {
  reviewModalVisible.value = false
  currentMoment.value = null
  reviewForm.reviewComment = ''
}

// 显示详情模态框
const showDetailModal = (moment: Moment) => {
  currentMoment.value = moment
  detailModalVisible.value = true
}

// 关闭详情模态框
const closeDetailModal = () => {
  detailModalVisible.value = false
  currentMoment.value = null
}

// 处理审核
const handleReview = async (status: 'approved' | 'rejected') => {
  if (!currentMoment.value) return
  
  reviewing.value = true
  try {
    const response = await reviewMoment(currentMoment.value.uuid, {
      status,
      reviewComment: reviewForm.reviewComment
    })
    
    if (response.status) {
      message.success(response.message)
      closeReviewModal()
      refreshData()
    } else {
      message.error(response.message || '审核失败')
    }
  } catch (error) {
    console.error('审核失败:', error)
    message.error('审核失败，请重试')
  } finally {
    reviewing.value = false
  }
}

// 工具函数
const getStatusText = (status: string) => {
  const statusMap = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
    published: '已发布',
    draft: '草稿',
    deleted: '已删除'
  }
  return statusMap[status as keyof typeof statusMap] || status
}

const getStatusColor = (status: string) => {
  const colorMap = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
    published: 'blue',
    draft: 'default',
    deleted: 'gray'
  }
  return colorMap[status as keyof typeof colorMap] || 'default'
}

const getPrivacyText = (privacy: string) => {
  const privacyMap = {
    public: '所有人可见',
    friends: '仅好友可见',
    private: '仅自己可见'
  }
  return privacyMap[privacy as keyof typeof privacyMap] || privacy
}

const formatDate = (dateString: string) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 组件挂载时加载数据
onMounted(() => {
  loadStatistics()
  loadMoments()
})
</script>

<style scoped>
.moment-review {
  padding: 24px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.page-header {
  background: #fff;
  margin-bottom: 16px;
  padding: 16px 24px;
  border-radius: 2px;
}

.stats-row {
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 16px;
}

.moment-content {
  font-size: 14px;
  line-height: 1.6;
  margin: 12px 0;
  color: #333;
}

.moment-images {
  margin: 12px 0;
}

.moment-images .ant-image {
  margin-right: 8px;
  margin-bottom: 8px;
}

.review-info {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.moment-detail-content {
  margin: 16px 0;
}

.moment-detail-content h4 {
  margin-bottom: 8px;
  color: #333;
}

.moment-detail-content p {
  margin-bottom: 16px;
  line-height: 1.6;
  color: #666;
}

.moment-detail-images {
  margin-top: 16px;
}

.moment-detail-images h4 {
  margin-bottom: 8px;
  color: #333;
}

.review-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.ant-list-item {
  padding: 20px 0 !important;
}

.ant-list-item-meta-title {
  margin-bottom: 8px !important;
}

.ant-list-item-meta-description {
  margin-bottom: 12px !important;
}

.ant-list-item-action {
  margin-left: 0 !important;
}

.ant-list-item-action > li {
  padding: 0 8px !important;
}

.action-link {
  cursor: pointer;
  color: #1890ff;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.action-link:hover {
  color: #40a9ff;
}

.review-button {
  background: linear-gradient(135deg, #1890ff 0%, #40a9ff 100%) !important;
  border: none !important;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.3) !important;
  font-weight: 600 !important;
  transition: all 0.3s ease !important;
}

.review-button:hover {
  background: linear-gradient(135deg, #40a9ff 0%, #1890ff 100%) !important;
  box-shadow: 0 4px 12px rgba(24, 144, 255, 0.4) !important;
  transform: translateY(-1px) !important;
}

.review-button:active {
  transform: translateY(0) !important;
}

/* 详情模态框样式 */
.content-text {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 4px;
  border-left: 3px solid #1890ff;
}

.detail-image {
  margin-right: 8px;
  margin-bottom: 8px;
  border-radius: 4px;
}

.review-info-detail {
  margin-top: 16px;
  padding: 12px;
  background: #f0f8ff;
  border-radius: 4px;
  border: 1px solid #d6e4ff;
}

.review-info-detail h4 {
  margin-bottom: 8px;
  color: #1890ff;
}

.review-info-detail p {
  margin-bottom: 4px;
  color: #666;
}

.detail-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}
</style>

