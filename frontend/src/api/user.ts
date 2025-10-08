import request from '@/utils/request'
import type { ApiResponse, User, UserListParams, UserListResponse } from '@/types/user'

/**
 * 获取用户列表
 */
export function getUserList(params: UserListParams): Promise<ApiResponse<UserListResponse>> {
  return request({
    url: '/api/admin/users',
    method: 'get',
    params
  })
}

/**
 * 获取用户详情
 */
export function getUserDetail(userId: string): Promise<ApiResponse<User>> {
  return request({
    url: `/api/admin/users/${userId}`,
    method: 'get'
  })
}

/**
 * 更新用户信息
 */
export function updateUser(userId: string, data: Partial<User>): Promise<ApiResponse> {
  return request({
    url: `/api/admin/users/${userId}`,
    method: 'put',
    data
  })
}

/**
 * 更新用户状态
 */
export function updateUserStatus(userId: string, status: string): Promise<ApiResponse> {
  return request({
    url: `/api/admin/users/${userId}/status`,
    method: 'put',
    data: { status }
  })
}

/**
 * 删除用户
 */
export function deleteUser(userId: string): Promise<ApiResponse> {
  return request({
    url: `/api/admin/users/${userId}`,
    method: 'delete'
  })
}

/**
 * 批量操作用户
 */
export function batchOperateUsers(userIds: string[], operation: string): Promise<ApiResponse> {
  return request({
    url: '/api/admin/users/batch',
    method: 'post',
    data: {
      userIds,
      operation
    }
  })
}

/**
 * 获取用户统计数据
 */
export function getUserStatistics(): Promise<ApiResponse> {
  return request({
    url: '/api/admin/users/statistics',
    method: 'get'
  })
}

