import { create } from 'zustand';

/**
 * 用户信息状态管理 Store
 * 
 * 管理用户资料、关注统计、积分、动态数量等
 */
const useUserStore = create((set, get) => ({
  // ========== 用户资料缓存 ==========
  
  // 缓存用户信息（避免重复请求）
  usersCache: {}, // { uuid: { userInfo, lastUpdate } }
  
  // 获取用户信息
  getUserInfo: (uuid) => {
    const { usersCache } = get();
    return usersCache[uuid]?.userInfo || null;
  },
  
  // 设置用户信息
  setUserInfo: (uuid, userInfo) => {
    const { usersCache } = get();
    set({
      usersCache: {
        ...usersCache,
        [uuid]: {
          userInfo: userInfo,
          lastUpdate: Date.now(),
        }
      }
    });
  },
  
  // 批量设置用户信息
  setMultipleUserInfo: (users) => {
    const { usersCache } = get();
    const newCache = { ...usersCache };
    
    users.forEach(user => {
      newCache[user.uuid] = {
        userInfo: user,
        lastUpdate: Date.now(),
      };
    });
    
    set({ usersCache: newCache });
  },
  
  // 检查用户信息是否需要更新（超过5分钟）
  shouldUpdateUserInfo: (uuid) => {
    const { usersCache } = get();
    const cached = usersCache[uuid];
    
    if (!cached) return true;
    
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - cached.lastUpdate > fiveMinutes;
  },
  
  // ========== 关注统计 ==========
  
  followStats: {}, // { uuid: { followingCount, followersCount, isFollowing } }
  
  // 获取关注统计
  getFollowStats: (uuid) => {
    const { followStats } = get();
    return followStats[uuid] || {
      followingCount: 0,
      followersCount: 0,
      isFollowing: false,
    };
  },
  
  // 设置关注统计
  setFollowStats: (uuid, stats) => {
    const { followStats } = get();
    set({
      followStats: {
        ...followStats,
        [uuid]: stats,
      }
    });
  },
  
  // 更新关注状态
  updateFollowStatus: (uuid, isFollowing) => {
    const { followStats } = get();
    const currentStats = followStats[uuid] || {
      followingCount: 0,
      followersCount: 0,
      isFollowing: false,
    };
    
    set({
      followStats: {
        ...followStats,
        [uuid]: {
          ...currentStats,
          isFollowing: isFollowing,
          followersCount: currentStats.followersCount + (isFollowing ? 1 : -1),
        }
      }
    });
  },
  
  // ========== 积分信息 ==========
  
  pointsInfo: {}, // { uuid: { totalPoints, level, todayPoints } }
  
  // 获取积分信息
  getPointsInfo: (uuid) => {
    const { pointsInfo } = get();
    return pointsInfo[uuid] || {
      totalPoints: 0,
      level: 1,
      todayPoints: 0,
      // 兼容旧版本字段
      points: 0,
      continuous_days: 0,
      is_checked_in_today: false,
    };
  },
  
  // 设置积分信息
  setPointsInfo: (uuid, points) => {
    const { pointsInfo } = get();
    set({
      pointsInfo: {
        ...pointsInfo,
        [uuid]: points,
      }
    });
  },
  
  // 增加积分
  addPoints: (uuid, points) => {
    const { pointsInfo } = get();
    const current = pointsInfo[uuid] || {
      totalPoints: 0,
      level: 1,
      todayPoints: 0,
    };
    
    set({
      pointsInfo: {
        ...pointsInfo,
        [uuid]: {
          ...current,
          totalPoints: current.totalPoints + points,
          todayPoints: current.todayPoints + points,
        }
      }
    });
  },
  
  // ========== 动态统计 ==========
  
  momentCounts: {}, // { uuid: count }
  
  // 获取动态数量
  getMomentCount: (uuid) => {
    const { momentCounts } = get();
    return momentCounts[uuid] || 0;
  },
  
  // 设置动态数量
  setMomentCount: (uuid, count) => {
    const { momentCounts } = get();
    set({
      momentCounts: {
        ...momentCounts,
        [uuid]: count,
      }
    });
  },
  
  // 增加动态数量
  incrementMomentCount: (uuid) => {
    const { momentCounts } = get();
    const current = momentCounts[uuid] || 0;
    set({
      momentCounts: {
        ...momentCounts,
        [uuid]: current + 1,
      }
    });
  },
  
  // 减少动态数量
  decrementMomentCount: (uuid) => {
    const { momentCounts } = get();
    const current = momentCounts[uuid] || 0;
    set({
      momentCounts: {
        ...momentCounts,
        [uuid]: Math.max(0, current - 1),
      }
    });
  },
  
  // ========== 用户列表（关注/粉丝）==========
  
  followLists: {
    // followingList: { uuid: [...users], loading: false }
    // followersList: { uuid: [...users], loading: false }
  },
  
  // 获取关注列表
  getFollowingList: (uuid) => {
    const { followLists } = get();
    return followLists[`following_${uuid}`] || { users: [], loading: false };
  },
  
  // 设置关注列表
  setFollowingList: (uuid, users) => {
    const { followLists } = get();
    set({
      followLists: {
        ...followLists,
        [`following_${uuid}`]: { users, loading: false },
      }
    });
  },
  
  // 获取粉丝列表
  getFollowersList: (uuid) => {
    const { followLists } = get();
    return followLists[`followers_${uuid}`] || { users: [], loading: false };
  },
  
  // 设置粉丝列表
  setFollowersList: (uuid, users) => {
    const { followLists } = get();
    set({
      followLists: {
        ...followLists,
        [`followers_${uuid}`]: { users, loading: false },
      }
    });
  },
  
  // ========== 在线状态 ==========
  
  onlineStatus: {}, // { uuid: { online: true, lastSeen: timestamp } }
  
  // 设置在线状态
  setOnlineStatus: (uuid, online, lastSeen = Date.now()) => {
    const { onlineStatus } = get();
    set({
      onlineStatus: {
        ...onlineStatus,
        [uuid]: { online, lastSeen },
      }
    });
  },
  
  // 获取在线状态
  getOnlineStatus: (uuid) => {
    const { onlineStatus } = get();
    return onlineStatus[uuid] || { online: false, lastSeen: 0 };
  },
  
  // 批量更新在线状态
  updateOnlineStatusBatch: (statusList) => {
    const { onlineStatus } = get();
    const newStatus = { ...onlineStatus };
    
    statusList.forEach(({ uuid, online, lastSeen }) => {
      newStatus[uuid] = { online, lastSeen };
    });
    
    set({ onlineStatus: newStatus });
  },
  
  // ========== 清理函数 ==========
  
  // 清理用户缓存（释放内存）
  clearUserCache: (uuid) => {
    const { usersCache } = get();
    const newCache = { ...usersCache };
    delete newCache[uuid];
    set({ usersCache: newCache });
  },
  
  // 清理过期缓存（超过1小时）
  clearExpiredCache: () => {
    const { usersCache } = get();
    const oneHour = 60 * 60 * 1000;
    const now = Date.now();
    
    const newCache = {};
    Object.keys(usersCache).forEach(uuid => {
      if (now - usersCache[uuid].lastUpdate < oneHour) {
        newCache[uuid] = usersCache[uuid];
      }
    });
    
    set({ usersCache: newCache });
  },
  
  // 清理所有数据
  clearAll: () => {
    set({
      usersCache: {},
      followStats: {},
      pointsInfo: {},
      momentCounts: {},
      followLists: {},
      onlineStatus: {},
    });
  },
}));

export default useUserStore;

