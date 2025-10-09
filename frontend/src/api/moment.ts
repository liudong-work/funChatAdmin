import request from '@/utils/request'
import type { ApiResponse } from '@/types/user'

// 动态相关类型定义
export interface Moment {
  id: number
  uuid: string
  content: string
  images: string[]
  privacy: 'public' | 'friends' | 'private'
  status: 'pending' | 'approved' | 'rejected'
  user_id: number
  created_at: string
  updated_at: string
  reviewed_at?: string
  reviewed_by?: number
  review_comment?: string
  likes_count: number
  comments_count: number
  author: {
    id: number
    username: string
    nickname: string
    phone: string
  }
}

export interface MomentListParams {
  page?: number
  pageSize?: number
  status?: string
  startDate?: string
  endDate?: string
}

export interface MomentListResponse {
  list: Moment[]
  total: number
  page: number
  pageSize: number
}

export interface MomentStatistics {
  total: number
  pending: number
  approved: number
  rejected: number
  today: number
  thisWeek: number
}

/**
 * 获取待审核动态列表
 */
export function getPendingMoments(params: MomentListParams = {}): Promise<ApiResponse<MomentListResponse>> {
  return request({
    url: '/api/admin/moments/pending',
    method: 'get',
    params
  })
}

/**
 * 获取所有动态列表
 */
export function getAllMoments(params: MomentListParams = {}): Promise<ApiResponse<MomentListResponse>> {
  return request({
    url: '/api/admin/moments/all',
    method: 'get',
    params
  })
}

/**
 * 获取动态详情
 */
export function getMomentDetail(uuid: string): Promise<ApiResponse<Moment>> {
  return request({
    url: `/api/admin/moments/detail/${uuid}`,
    method: 'get'
  })
}

/**
 * 审核动态
 */
export function reviewMoment(uuid: string, data: {
  status: 'approved' | 'rejected'
  reviewComment?: string
}): Promise<ApiResponse> {
  return request({
    url: `/api/admin/moments/review/${uuid}`,
    method: 'post',
    data
  })
}

/**
 * 获取动态统计数据
 */
export function getMomentStatistics(): Promise<ApiResponse<MomentStatistics>> {
  return request({
    url: '/api/admin/moments/statistics',
    method: 'get'
  })
}
