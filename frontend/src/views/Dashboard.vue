<template>
  <div class="dashboard">
    <a-page-header title="仪表盘" sub-title="系统数据概览" class="page-header" />

    <!-- 数据统计卡片 -->
    <a-row :gutter="16" class="stats-row">
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            title="总用户数"
            :value="statistics.totalUsers"
            :prefix="h(UserOutlined)"
            :value-style="{ color: '#3f8600' }"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            title="今日新增用户"
            :value="statistics.todayUsers"
            :prefix="h(TeamOutlined)"
            :value-style="{ color: '#1890ff' }"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            title="在线用户"
            :value="statistics.onlineUsers"
            :prefix="h(UserAddOutlined)"
            :value-style="{ color: '#faad14' }"
          />
        </a-card>
      </a-col>
      <a-col :xs="24" :sm="12" :lg="6">
        <a-card :bordered="false" class="stat-card">
          <a-statistic
            title="待审核内容"
            :value="statistics.pendingReviews"
            :prefix="h(WarningOutlined)"
            :value-style="{ color: '#cf1322' }"
          />
        </a-card>
      </a-col>
    </a-row>

    <!-- 快捷操作 -->
    <a-card title="快捷操作" :bordered="false" class="quick-actions">
      <a-space :size="16">
        <a-button type="primary" @click="$router.push('/users')">
          <template #icon><UserOutlined /></template>
          用户管理
        </a-button>
        <a-button @click="$router.push('/messages')">
          <template #icon><MessageOutlined /></template>
          消息审核
        </a-button>
        <a-button @click="$router.push('/statistics')">
          <template #icon><BarChartOutlined /></template>
          数据统计
        </a-button>
        <a-button @click="$router.push('/system')">
          <template #icon><SettingOutlined /></template>
          系统设置
        </a-button>
      </a-space>
    </a-card>

    <!-- 最近活动 -->
    <a-row :gutter="16" class="recent-row">
      <a-col :xs="24" :lg="12">
        <a-card title="最近注册用户" :bordered="false">
          <a-list :data-source="recentUsers" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #avatar>
                    <a-avatar>{{ item.username?.charAt(0) || '?' }}</a-avatar>
                  </template>
                  <template #title>{{ item.username }}</template>
                  <template #description>{{ item.phone }}</template>
                </a-list-item-meta>
                <div>{{ formatTime(item.createdAt) }}</div>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
      <a-col :xs="24" :lg="12">
        <a-card title="系统通知" :bordered="false">
          <a-list :data-source="notifications" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #avatar>
                    <a-badge :status="item.status" />
                  </template>
                  <template #title>{{ item.title }}</template>
                  <template #description>{{ item.description }}</template>
                </a-list-item-meta>
                <div>{{ formatTime(item.time) }}</div>
              </a-list-item>
            </template>
          </a-list>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import {
  UserOutlined,
  TeamOutlined,
  UserAddOutlined,
  WarningOutlined,
  MessageOutlined,
  BarChartOutlined,
  SettingOutlined
} from '@ant-design/icons-vue'

// 统计数据
const statistics = ref({
  totalUsers: 1256,
  todayUsers: 48,
  onlineUsers: 324,
  pendingReviews: 15
})

// 最近注册用户
const recentUsers = ref([
  {
    username: '张三',
    phone: '13800138001',
    createdAt: new Date().toISOString()
  },
  {
    username: '李四',
    phone: '13800138002',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    username: '王五',
    phone: '13800138003',
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
])

// 系统通知
const notifications = ref([
  {
    title: '新用户注册',
    description: '有48位新用户注册',
    time: new Date().toISOString(),
    status: 'success'
  },
  {
    title: '内容待审核',
    description: '有15条内容待审核',
    time: new Date(Date.now() - 1800000).toISOString(),
    status: 'warning'
  },
  {
    title: '系统更新',
    description: '系统已更新到最新版本',
    time: new Date(Date.now() - 86400000).toISOString(),
    status: 'processing'
  }
])

// 格式化时间
const formatTime = (time: string) => {
  const now = Date.now()
  const diff = now - new Date(time).getTime()
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  
  return new Date(time).toLocaleDateString('zh-CN')
}

onMounted(() => {
  // 这里可以调用API获取真实数据
  console.log('Dashboard mounted')
})
</script>

<style scoped>
.dashboard {
  padding: 0;
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

.stat-card {
  background: #fff;
  border-radius: 2px;
  margin-bottom: 16px;
}

.quick-actions {
  margin-bottom: 16px;
}

.recent-row {
  margin-bottom: 16px;
}
</style>

