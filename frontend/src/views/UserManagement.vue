<template>
  <div class="user-management">
    <!-- 页面标题 -->
    <a-page-header
      title="用户管理"
      sub-title="管理所有注册用户"
      class="page-header"
    />

    <!-- 搜索和筛选 -->
    <a-card class="search-card" :bordered="false">
      <a-form layout="inline" :model="searchForm">
        <a-form-item label="用户名">
          <a-input
            v-model:value="searchForm.username"
            placeholder="请输入用户名"
            style="width: 200px"
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input
            v-model:value="searchForm.phone"
            placeholder="请输入手机号"
            style="width: 200px"
            @pressEnter="handleSearch"
          />
        </a-form-item>
        <a-form-item label="状态">
          <a-select
            v-model:value="searchForm.status"
            placeholder="请选择状态"
            style="width: 150px"
            allowClear
          >
            <a-select-option value="active">正常</a-select-option>
            <a-select-option value="banned">封禁</a-select-option>
            <a-select-option value="frozen">冻结</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item>
          <a-space>
            <a-button type="primary" @click="handleSearch">
              <template #icon><SearchOutlined /></template>
              搜索
            </a-button>
            <a-button @click="handleReset">
              <template #icon><ReloadOutlined /></template>
              重置
            </a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 用户列表 -->
    <a-card class="table-card" :bordered="false">
      <template #title>
        <div class="table-title">
          <span>用户列表</span>
          <a-space>
            <a-button @click="handleRefresh">
              <template #icon><ReloadOutlined /></template>
              刷新
            </a-button>
            <a-button type="primary" @click="handleExport">
              <template #icon><DownloadOutlined /></template>
              导出
            </a-button>
          </a-space>
        </div>
      </template>

      <a-table
        :columns="columns"
        :data-source="userList"
        :loading="loading"
        :pagination="pagination"
        @change="handleTableChange"
        row-key="id"
      >
        <!-- 用户信息 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user'">
            <div class="user-info">
              <a-avatar :size="40">{{ record.username?.charAt(0) || '?' }}</a-avatar>
              <div class="user-detail">
                <div class="user-name">{{ record.username }}</div>
                <div class="user-phone">{{ record.phone }}</div>
              </div>
            </div>
          </template>

          <!-- 状态标签 -->
          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">
              {{ getStatusText(record.status) }}
            </a-tag>
          </template>

          <!-- 注册时间 -->
          <template v-else-if="column.key === 'createdAt'">
            {{ formatDate(record.createdAt) }}
          </template>

          <!-- 最后登录 -->
          <template v-else-if="column.key === 'lastLogin'">
            {{ record.lastLogin ? formatDate(record.lastLogin) : '从未登录' }}
          </template>

          <!-- 操作按钮 -->
          <template v-else-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="handleView(record)">
                查看
              </a-button>
              <a-button type="link" size="small" @click="handleEdit(record)">
                编辑
              </a-button>
              <a-dropdown>
                <a-button type="link" size="small">
                  更多 <DownOutlined />
                </a-button>
                <template #overlay>
                  <a-menu @click="({ key }) => handleMoreAction(key, record)">
                    <a-menu-item key="ban" v-if="record.status !== 'banned'">
                      封禁用户
                    </a-menu-item>
                    <a-menu-item key="unban" v-if="record.status === 'banned'">
                      解除封禁
                    </a-menu-item>
                    <a-menu-item key="freeze" v-if="record.status !== 'frozen'">
                      冻结账号
                    </a-menu-item>
                    <a-menu-item key="unfreeze" v-if="record.status === 'frozen'">
                      解除冻结
                    </a-menu-item>
                    <a-menu-divider />
                    <a-menu-item key="delete" danger>
                      删除用户
                    </a-menu-item>
                  </a-menu>
                </template>
              </a-dropdown>
            </a-space>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 用户详情/编辑抽屉 -->
    <a-drawer
      v-model:open="drawerVisible"
      :title="drawerTitle"
      :width="600"
      @close="handleDrawerClose"
    >
      <a-form
        :model="currentUser"
        :label-col="{ span: 6 }"
        :wrapper-col="{ span: 18 }"
      >
        <a-form-item label="用户ID">
          <a-input v-model:value="currentUser.id" disabled />
        </a-form-item>
        <a-form-item label="用户名">
          <a-input v-model:value="currentUser.username" :disabled="!isEditing" />
        </a-form-item>
        <a-form-item label="手机号">
          <a-input v-model:value="currentUser.phone" :disabled="!isEditing" />
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="currentUser.status" :disabled="!isEditing">
            <a-select-option value="active">正常</a-select-option>
            <a-select-option value="banned">封禁</a-select-option>
            <a-select-option value="frozen">冻结</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="注册时间">
          <a-input :value="formatDate(currentUser.createdAt)" disabled />
        </a-form-item>
        <a-form-item label="最后登录">
          <a-input :value="currentUser.lastLogin ? formatDate(currentUser.lastLogin) : '从未登录'" disabled />
        </a-form-item>
      </a-form>

      <template #footer>
        <a-space>
          <a-button @click="handleDrawerClose">取消</a-button>
          <a-button v-if="isEditing" type="primary" @click="handleSave" :loading="saving">
            保存
          </a-button>
        </a-space>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import {
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DownOutlined
} from '@ant-design/icons-vue'
import { getUserList, updateUserStatus, deleteUser } from '@/api/user'
import type { User } from '@/types/user'

// 搜索表单
const searchForm = reactive({
  username: '',
  phone: '',
  status: undefined as string | undefined
})

// 表格数据
const userList = ref<User[]>([])
const loading = ref(false)
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条记录`
})

// 表格列配置
const columns = [
  {
    title: '用户信息',
    key: 'user',
    width: 250
  },
  {
    title: '状态',
    key: 'status',
    width: 100
  },
  {
    title: '注册时间',
    key: 'createdAt',
    width: 180
  },
  {
    title: '最后登录',
    key: 'lastLogin',
    width: 180
  },
  {
    title: '操作',
    key: 'action',
    width: 200,
    fixed: 'right' as const
  }
]

// 抽屉相关
const drawerVisible = ref(false)
const drawerTitle = ref('')
const isEditing = ref(false)
const saving = ref(false)
const currentUser = ref<Partial<User>>({})

// 加载用户列表
const loadUserList = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.current,
      pageSize: pagination.pageSize,
      ...searchForm
    }
    const response = await getUserList(params)
    
    if (response.status) {
      userList.value = response.data.list
      pagination.total = response.data.total
    } else {
      message.error(response.message || '加载用户列表失败')
    }
  } catch (error) {
    console.error('加载用户列表失败:', error)
    message.error('加载用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.current = 1
  loadUserList()
}

// 重置
const handleReset = () => {
  searchForm.username = ''
  searchForm.phone = ''
  searchForm.status = undefined
  pagination.current = 1
  loadUserList()
}

// 刷新
const handleRefresh = () => {
  loadUserList()
}

// 导出
const handleExport = () => {
  message.info('导出功能开发中...')
}

// 表格分页变化
const handleTableChange = (paginationData: any) => {
  pagination.current = paginationData.current
  pagination.pageSize = paginationData.pageSize
  loadUserList()
}

// 查看用户
const handleView = (record: User) => {
  currentUser.value = { ...record }
  drawerTitle.value = '用户详情'
  isEditing.value = false
  drawerVisible.value = true
}

// 编辑用户
const handleEdit = (record: User) => {
  currentUser.value = { ...record }
  drawerTitle.value = '编辑用户'
  isEditing.value = true
  drawerVisible.value = true
}

// 保存编辑
const handleSave = async () => {
  saving.value = true
  try {
    // TODO: 调用更新用户信息接口
    await new Promise(resolve => setTimeout(resolve, 1000))
    message.success('保存成功')
    drawerVisible.value = false
    loadUserList()
  } catch (error) {
    message.error('保存失败')
  } finally {
    saving.value = false
  }
}

// 关闭抽屉
const handleDrawerClose = () => {
  drawerVisible.value = false
  currentUser.value = {}
}

// 更多操作
const handleMoreAction = async (key: string, record: User) => {
  switch (key) {
    case 'ban':
      Modal.confirm({
        title: '确认封禁',
        content: `确定要封禁用户 ${record.username} 吗？`,
        onOk: async () => {
          await handleUpdateStatus(record.id, 'banned')
        }
      })
      break
    case 'unban':
      await handleUpdateStatus(record.id, 'active')
      break
    case 'freeze':
      Modal.confirm({
        title: '确认冻结',
        content: `确定要冻结用户 ${record.username} 吗？`,
        onOk: async () => {
          await handleUpdateStatus(record.id, 'frozen')
        }
      })
      break
    case 'unfreeze':
      await handleUpdateStatus(record.id, 'active')
      break
    case 'delete':
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除用户 ${record.username} 吗？此操作不可恢复！`,
        okText: '确认删除',
        okType: 'danger',
        onOk: async () => {
          await handleDelete(record.id)
        }
      })
      break
  }
}

// 更新用户状态
const handleUpdateStatus = async (userId: string, status: string) => {
  try {
    const response = await updateUserStatus(userId, status)
    if (response.status) {
      message.success('操作成功')
      loadUserList()
    } else {
      message.error(response.message || '操作失败')
    }
  } catch (error) {
    message.error('操作失败')
  }
}

// 删除用户
const handleDelete = async (userId: string) => {
  try {
    const response = await deleteUser(userId)
    if (response.status) {
      message.success('删除成功')
      loadUserList()
    } else {
      message.error(response.message || '删除失败')
    }
  } catch (error) {
    message.error('删除失败')
  }
}

// 获取状态颜色
const getStatusColor = (status: string) => {
  const colorMap: Record<string, string> = {
    active: 'success',
    banned: 'error',
    frozen: 'warning'
  }
  return colorMap[status] || 'default'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    active: '正常',
    banned: '封禁',
    frozen: '冻结'
  }
  return textMap[status] || '未知'
}

// 格式化日期
const formatDate = (date: string | Date | undefined) => {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 组件挂载时加载数据
onMounted(() => {
  loadUserList()
})
</script>

<style scoped>
.user-management {
  padding: 24px;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}

.page-header {
  background: #fff;
  margin-bottom: 24px;
  padding: 20px 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-card {
  margin-bottom: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-card {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.table-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-weight: 500;
  color: #000;
}

.user-phone {
  font-size: 12px;
  color: #999;
}

/* 优化表格样式 */
:deep(.ant-table) {
  border-radius: 8px;
}

:deep(.ant-table-thead > tr > th) {
  background: #fafafa;
  font-weight: 600;
}

:deep(.ant-table-tbody > tr:hover > td) {
  background: #f5f5f5;
}

/* 优化卡片内容 */
:deep(.ant-card-body) {
  padding: 24px;
}

/* 优化按钮样式 */
:deep(.ant-btn) {
  border-radius: 6px;
  transition: all 0.3s ease;
}

:deep(.ant-btn:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* 优化输入框样式 */
:deep(.ant-input) {
  border-radius: 6px;
}

:deep(.ant-select) {
  border-radius: 6px;
}
</style>

