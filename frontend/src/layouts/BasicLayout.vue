<template>
  <a-layout class="layout">
    <!-- 顶部导航栏 -->
    <a-layout-header class="header">
      <div class="logo">
        <img src="/favicon.ico" alt="Logo" />
        <span>聊天应用管理系统</span>
      </div>
      <div class="header-right">
        <a-dropdown>
          <a-button type="text" class="user-btn">
            <UserOutlined />
            <span class="user-name">{{ username }}</span>
          </a-button>
          <template #overlay>
            <a-menu>
              <a-menu-item key="profile">
                <UserOutlined />
                个人中心
              </a-menu-item>
              <a-menu-item key="settings">
                <SettingOutlined />
                设置
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="logout" @click="handleLogout">
                <LogoutOutlined />
                退出登录
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </div>
    </a-layout-header>

    <a-layout>
      <!-- 左侧菜单 -->
      <a-layout-sider v-model:collapsed="collapsed" :trigger="null" collapsible class="sider">
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          theme="dark"
          :items="menuItems"
          @click="handleMenuClick"
        />
      </a-layout-sider>

      <!-- 主内容区 -->
      <a-layout-content class="content">
        <div class="content-wrapper">
          <router-view />
        </div>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  UserOutlined,
  TeamOutlined,
  DashboardOutlined,
  MessageOutlined,
  SettingOutlined,
  LogoutOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons-vue'

const router = useRouter()
const collapsed = ref(false)
const selectedKeys = ref<string[]>(['dashboard'])
const username = ref('管理员')

// 获取当前登录的管理员信息
const getCurrentAdmin = () => {
  try {
    const adminUser = localStorage.getItem('admin_user')
    if (adminUser) {
      const user = JSON.parse(adminUser)
      username.value = user.username || '管理员'
    }
  } catch (error) {
    console.error('获取管理员信息失败:', error)
  }
}

// 组件挂载时获取管理员信息
onMounted(() => {
  getCurrentAdmin()
})

// 菜单项配置
const menuItems = [
  {
    key: 'dashboard',
    icon: () => h(DashboardOutlined),
    label: '仪表盘',
    title: '仪表盘'
  },
  {
    key: 'users',
    icon: () => h(TeamOutlined),
    label: '用户管理',
    title: '用户管理'
  },
  {
    key: 'content',
    icon: () => h(MessageOutlined),
    label: '内容审核',
    title: '内容审核',
    children: [
      {
        key: 'messages',
        label: '消息审核',
        title: '消息审核'
      },
      {
        key: 'moments',
        label: '动态审核',
        title: '动态审核'
      },
      {
        key: 'bottles',
        label: '漂流瓶审核',
        title: '漂流瓶审核'
      }
    ]
  },
  {
    key: 'statistics',
    icon: () => h(BarChartOutlined),
    label: '数据统计',
    title: '数据统计'
  },
  {
    key: 'reports',
    icon: () => h(FileTextOutlined),
    label: '举报管理',
    title: '举报管理'
  },
  {
    key: 'system',
    icon: () => h(SettingOutlined),
    label: '系统设置',
    title: '系统设置'
  }
]

// 菜单点击事件
const handleMenuClick = ({ key }: { key: string }) => {
  selectedKeys.value = [key]
  router.push(`/${key}`)
}

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_user')
  router.push('/login')
}
</script>

<style scoped>
.layout {
  min-height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #001529;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 999;
  height: 64px;
  width: 100%;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
}

.logo img {
  width: 32px;
  height: 32px;
}

.header-right {
  display: flex;
  align-items: center;
}

.user-btn {
  color: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-size: 14px;
}

.sider {
  background: #001529;
  height: calc(100vh - 64px);
  overflow-y: auto;
}

.content {
  background: #f0f2f5;
  min-height: calc(100vh - 64px);
  width: 100%;
  overflow-y: auto;
}

.content-wrapper {
  padding: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
</style>

