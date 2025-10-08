import { createRouter, createWebHistory } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: BasicLayout,
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
          meta: { title: '仪表盘' }
        },
        {
          path: 'users',
          name: 'UserManagement',
          component: () => import('@/views/UserManagement.vue'),
          meta: { title: '用户管理' }
        },
        {
          path: 'messages',
          name: 'MessageReview',
          component: () => import('@/views/MessageReview.vue'),
          meta: { title: '消息审核' }
        },
        {
          path: 'moments',
          name: 'MomentReview',
          component: () => import('@/views/MomentReview.vue'),
          meta: { title: '动态审核' }
        },
        {
          path: 'bottles',
          name: 'BottleReview',
          component: () => import('@/views/BottleReview.vue'),
          meta: { title: '漂流瓶审核' }
        },
        {
          path: 'statistics',
          name: 'Statistics',
          component: () => import('@/views/Statistics.vue'),
          meta: { title: '数据统计' }
        },
        {
          path: 'reports',
          name: 'Reports',
          component: () => import('@/views/Reports.vue'),
          meta: { title: '举报管理' }
        },
        {
          path: 'system',
          name: 'System',
          component: () => import('@/views/SystemSettings.vue'),
          meta: { title: '系统设置' }
        }
      ]
    },
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { title: '登录' }
    }
  ]
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('admin_token')
  
  // 如果没有token且不是去登录页，则跳转到登录页
  if (!token && to.path !== '/login') {
    next('/login')
  } else if (token && to.path === '/login') {
    // 如果有token且要去登录页，则跳转到首页
    next('/')
  } else {
    next()
  }
})

export default router
