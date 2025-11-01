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
    });
  },
}));

export default useMomentStore;

