import { create } from 'zustand';

/**
 * 动态状态管理 Store
 * 
 * 管理动态列表、分页、刷新、图片预览等状态
 */
const useMomentStore = create((set, get) => ({
  // ========== 动态列表状态 ==========
  
  // 当前激活的标签页
  activeTab: 'latest', // 'follow' 或 'latest'
  
  // 动态列表数据（按标签分类）
  moments: {
    follow: {
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      refreshing: false,
      lastLoadTime: 0,
    },
    latest: {
      list: [],
      page: 1,
      hasMore: true,
      loading: false,
      refreshing: false,
      lastLoadTime: 0,
    },
  },
  
  // 切换标签
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },
  
  // 获取当前标签的动态列表
  getCurrentMoments: () => {
    const { activeTab, moments } = get();
    return moments[activeTab].list;
  },
  
  // 设置动态列表
  setMoments: (tab, list) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          list: list,
        }
      }
    });
  },
  
  // 添加动态到列表
  addMoment: (tab, moment) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          list: [moment, ...moments[tab].list],
        }
      }
    });
  },
  
  // 更新动态
  updateMoment: (momentUuid, updates) => {
    const { moments } = get();
    const newMoments = { ...moments };
    
    // 更新所有标签中的该动态
    Object.keys(newMoments).forEach(tab => {
      const index = newMoments[tab].list.findIndex(m => m.uuid === momentUuid);
      if (index !== -1) {
        newMoments[tab].list[index] = {
          ...newMoments[tab].list[index],
          ...updates,
        };
      }
    });
    
    set({ moments: newMoments });
  },
  
  // 删除动态
  deleteMoment: (momentUuid) => {
    const { moments } = get();
    const newMoments = { ...moments };
    
    // 从所有标签中删除该动态
    Object.keys(newMoments).forEach(tab => {
      newMoments[tab].list = newMoments[tab].list.filter(m => m.uuid !== momentUuid);
    });
    
    set({ moments: newMoments });
  },
  
  // ========== 加载状态管理 ==========
  
  // 设置加载状态
  setLoading: (tab, loading) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          loading: loading,
        }
      }
    });
  },
  
  // 设置刷新状态
  setRefreshing: (tab, refreshing) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          refreshing: refreshing,
        }
      }
    });
  },
  
  // 设置是否还有更多数据
  setHasMore: (tab, hasMore) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          hasMore: hasMore,
        }
      }
    });
  },
  
  // 更新页码
  setPage: (tab, page) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          page: page,
        }
      }
    });
  },
  
  // 更新最后加载时间
  setLastLoadTime: (tab, time) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          lastLoadTime: time,
        }
      }
    });
  },
  
  // ========== 下拉刷新 ==========
  
  refreshMoments: async (tab, loadFunction) => {
    const { moments } = get();
    
    // 设置刷新状态
    set({
      moments: {
        ...moments,
        [tab]: {
          ...moments[tab],
          refreshing: true,
        }
      }
    });
    
    try {
      const newMoments = await loadFunction(1);
      
      set({
        moments: {
          ...moments,
          [tab]: {
            ...moments[tab],
            list: newMoments,
            page: 1,
            hasMore: true,
            refreshing: false,
            lastLoadTime: Date.now(),
          }
        }
      });
    } catch (error) {
      console.error('[MomentStore] 刷新动态失败:', error);
      set({
        moments: {
          ...moments,
          [tab]: {
            ...moments[tab],
            refreshing: false,
          }
        }
      });
    }
  },
  
  // ========== 加载更多 ==========
  
  loadMoreMoments: async (tab, loadFunction) => {
    const { moments } = get();
    const currentTab = moments[tab];
    
    if (currentTab.loading || !currentTab.hasMore) return;
    
    // 设置加载状态
    set({
      moments: {
        ...moments,
        [tab]: {
          ...currentTab,
          loading: true,
        }
      }
    });
    
    try {
      const nextPage = currentTab.page + 1;
      const newMoments = await loadFunction(nextPage);
      
      set({
        moments: {
          ...moments,
          [tab]: {
            ...currentTab,
            list: [...currentTab.list, ...newMoments],
            page: nextPage,
            hasMore: newMoments.length > 0,
            loading: false,
            lastLoadTime: Date.now(),
          }
        }
      });
    } catch (error) {
      console.error('[MomentStore] 加载更多动态失败:', error);
      set({
        moments: {
          ...moments,
          [tab]: {
            ...currentTab,
            loading: false,
          }
        }
      });
    }
  },
  
  // ========== 图片预览状态 ==========
  
  imageViewer: {
    visible: false,
    images: [],
    currentIndex: 0,
  },
  
  showImageViewer: (images, index = 0) => {
    set({
      imageViewer: {
        visible: true,
        images: images,
        currentIndex: index,
      }
    });
  },
  
  hideImageViewer: () => {
    set({
      imageViewer: {
        visible: false,
        images: [],
        currentIndex: 0,
      }
    });
  },
  
  // ========== 点赞状态 ==========
  
  toggleLike: (momentUuid, isLiked, likesCount) => {
    const { updateMoment } = get();
    updateMoment(momentUuid, {
      is_liked: isLiked,
      likes_count: likesCount,
    });
  },
  
  // ========== 动态详情状态 (MomentDetailScreen) ==========
  
  // 动态详情数据 { momentUuid: { data, loading, refreshing } }
  momentDetails: {},
  
  // 获取动态详情
  getMomentDetail: (momentUuid) => {
    const { momentDetails } = get();
    return momentDetails[momentUuid] || {
      data: null,
      loading: false,
      refreshing: false,
    };
  },
  
  // 设置动态详情
  setMomentDetail: (momentUuid, data) => {
    const { momentDetails } = get();
    set({
      momentDetails: {
        ...momentDetails,
        [momentUuid]: {
          ...momentDetails[momentUuid],
          data: data,
        }
      }
    });
  },
  
  // 更新动态详情的部分字段
  updateMomentDetail: (momentUuid, updates) => {
    const { momentDetails } = get();
    const currentDetail = momentDetails[momentUuid];
    if (!currentDetail || !currentDetail.data) return;
    
    set({
      momentDetails: {
        ...momentDetails,
        [momentUuid]: {
          ...currentDetail,
          data: {
            ...currentDetail.data,
            ...updates,
          }
        }
      }
    });
  },
  
  // 设置动态详情加载状态
  setMomentDetailLoading: (momentUuid, loading) => {
    const { momentDetails } = get();
    set({
      momentDetails: {
        ...momentDetails,
        [momentUuid]: {
          ...momentDetails[momentUuid],
          loading: loading,
        }
      }
    });
  },
  
  // 设置动态详情刷新状态
  setMomentDetailRefreshing: (momentUuid, refreshing) => {
    const { momentDetails } = get();
    set({
      momentDetails: {
        ...momentDetails,
        [momentUuid]: {
          ...momentDetails[momentUuid],
          refreshing: refreshing,
        }
      }
    });
  },
  
  // ========== 评论状态 ==========
  
  // 评论列表 { momentUuid: { list, loading, submitting } }
  comments: {},
  
  // 获取评论列表
  getComments: (momentUuid) => {
    const { comments } = get();
    return comments[momentUuid]?.list || [];
  },
  
  // 设置评论列表
  setComments: (momentUuid, list) => {
    const { comments } = get();
    set({
      comments: {
        ...comments,
        [momentUuid]: {
          ...comments[momentUuid],
          list: list,
        }
      }
    });
  },
  
  // 添加评论
  addComment: (momentUuid, comment) => {
    const { comments } = get();
    const currentComments = comments[momentUuid]?.list || [];
    set({
      comments: {
        ...comments,
        [momentUuid]: {
          ...comments[momentUuid],
          list: [...currentComments, comment],
        }
      }
    });
  },
  
  // 设置评论加载状态
  setCommentsLoading: (momentUuid, loading) => {
    const { comments } = get();
    set({
      comments: {
        ...comments,
        [momentUuid]: {
          ...comments[momentUuid],
          loading: loading,
        }
      }
    });
  },
  
  // 设置评论提交状态
  setCommentSubmitting: (momentUuid, submitting) => {
    const { comments } = get();
    set({
      comments: {
        ...comments,
        [momentUuid]: {
          ...comments[momentUuid],
          submitting: submitting,
        }
      }
    });
  },
  
  // 获取评论提交状态
  getCommentSubmitting: (momentUuid) => {
    const { comments } = get();
    return comments[momentUuid]?.submitting || false;
  },
  
  // ========== 评论输入文本 ==========
  
  // 评论输入文本 { momentUuid: 'text' }
  commentTexts: {},
  
  // 获取评论输入文本
  getCommentText: (momentUuid) => {
    const { commentTexts } = get();
    return commentTexts[momentUuid] || '';
  },
  
  // 设置评论输入文本
  setCommentText: (momentUuid, text) => {
    const { commentTexts } = get();
    set({
      commentTexts: {
        ...commentTexts,
        [momentUuid]: text,
      }
    });
  },
  
  // 清空评论输入文本
  clearCommentText: (momentUuid) => {
    const { commentTexts } = get();
    const newCommentTexts = { ...commentTexts };
    delete newCommentTexts[momentUuid];
    set({ commentTexts: newCommentTexts });
  },
  
  // ========== 关注状态 (来自 userStore，但这里也需要) ==========
  
  // 关注状态 { userUuid: { isFollowing, loading } }
  followStatus: {},
  
  // 获取关注状态
  getFollowStatus: (userUuid) => {
    const { followStatus } = get();
    return followStatus[userUuid] || {
      isFollowing: false,
      loading: false,
    };
  },
  
  // 设置关注状态
  setFollowStatus: (userUuid, isFollowing) => {
    const { followStatus } = get();
    set({
      followStatus: {
        ...followStatus,
        [userUuid]: {
          ...followStatus[userUuid],
          isFollowing: isFollowing,
        }
      }
    });
  },
  
  // 设置关注加载状态
  setFollowLoading: (userUuid, loading) => {
    const { followStatus } = get();
    set({
      followStatus: {
        ...followStatus,
        [userUuid]: {
          ...followStatus[userUuid],
          loading: loading,
        }
      }
    });
  },
  
  // ========== 清理函数 ==========
  
  clearTab: (tab) => {
    const { moments } = get();
    set({
      moments: {
        ...moments,
        [tab]: {
          list: [],
          page: 1,
          hasMore: true,
          loading: false,
          refreshing: false,
          lastLoadTime: 0,
        }
      }
    });
  },
  
  clearMomentDetail: (momentUuid) => {
    const { momentDetails, comments, commentTexts } = get();
    
    const newMomentDetails = { ...momentDetails };
    const newComments = { ...comments };
    const newCommentTexts = { ...commentTexts };
    
    delete newMomentDetails[momentUuid];
    delete newComments[momentUuid];
    delete newCommentTexts[momentUuid];
    
    set({
      momentDetails: newMomentDetails,
      comments: newComments,
      commentTexts: newCommentTexts,
    });
  },
  
  clearAll: () => {
    set({
      activeTab: 'latest',
      moments: {
        follow: {
          list: [],
          page: 1,
          hasMore: true,
          loading: false,
          refreshing: false,
          lastLoadTime: 0,
        },
        latest: {
          list: [],
          page: 1,
          hasMore: true,
          loading: false,
          refreshing: false,
          lastLoadTime: 0,
        },
      },
      imageViewer: {
        visible: false,
        images: [],
        currentIndex: 0,
      },
      momentDetails: {},
      comments: {},
      commentTexts: {},
      followStatus: {},
    });
  },
}));

export default useMomentStore;

