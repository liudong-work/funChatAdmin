// 用户类型定义
export interface User {
  id: string
  username: string
  phone: string
  status: 'active' | 'banned' | 'frozen'
  createdAt: string
  lastLogin?: string
  avatar?: string
}

// 用户列表查询参数
export interface UserListParams {
  page: number
  pageSize: number
  username?: string
  phone?: string
  status?: string
}

// API响应类型
export interface ApiResponse<T = any> {
  status: boolean
  message?: string
  data: T
}

// 用户列表响应
export interface UserListResponse {
  list: User[]
  total: number
  page: number
  pageSize: number
}

