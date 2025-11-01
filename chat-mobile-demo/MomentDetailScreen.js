import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { userApi } from "./services/apiService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import useMomentStore from './stores/momentStore';

const { width } = Dimensions.get('window');

export default function MomentDetailScreen({ route, navigation }) {
  const { moment } = route.params;
  console.log('MomentDetailScreen 接收到的参数:', { moment, routeParams: route.params });
  
  const momentUuid = moment?.uuid;
  const authorUuid = moment?.author?.uuid;
  
  // ✅ 使用 useMomentStore 替代所有 useState
  const {
    getMomentDetail,
    setMomentDetail,
    updateMomentDetail,
    setMomentDetailLoading,
    setMomentDetailRefreshing,
    getComments,
    setComments,
    setCommentsLoading,
    getCommentSubmitting,
    setCommentSubmitting,
    getCommentText,
    setCommentText,
    clearCommentText,
    getFollowStatus,
    setFollowStatus,
    setFollowLoading,
    imageViewer,
    showImageViewer,
    hideImageViewer,
  } = useMomentStore();
  
  // ✅ 从 store 获取状态
  const momentDetail = getMomentDetail(momentUuid);
  const momentData = momentDetail.data || moment;
  const loading = momentDetail.loading;
  const refreshing = momentDetail.refreshing;
  
  const comments = getComments(momentUuid);
  const isSubmittingComment = getCommentSubmitting(momentUuid);
  const commentText = getCommentText(momentUuid);
  
  const followStatus = authorUuid ? getFollowStatus(authorUuid) : { isFollowing: false, loading: false };
  const isFollowing = followStatus.isFollowing;
  const isFollowLoading = followStatus.loading;

  useEffect(() => {
    // ✅ 初始化动态详情到 store
    if (!momentDetail.data) {
      setMomentDetail(momentUuid, moment);
    }
    
    loadComments();
    checkFollowStatus();
  }, []);

  // ✅ 检查关注状态（使用 store）
  const checkFollowStatus = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) return;

      if (!authorUuid) {
        console.error('authorUuid 不存在:', momentData);
        return;
      }

      const response = await userApi.checkFollowStatus(authorUuid, token);
      if (response.status) {
        setFollowStatus(authorUuid, response.data.is_following);
      }
    } catch (error) {
      console.error('检查关注状态失败:', error);
    }
  };

  // ✅ 关注/取消关注（使用 store）
  const handleFollow = async () => {
    try {
      setFollowLoading(authorUuid, true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      const response = await userApi.followUser(authorUuid, token);
      if (response.status) {
        setFollowStatus(authorUuid, response.data.is_following);
        Alert.alert('成功', response.message);
      } else {
        Alert.alert('错误', response.message || '操作失败');
      }
    } catch (error) {
      console.error('关注操作失败:', error);
      Alert.alert('错误', '网络错误，请重试');
    } finally {
      setFollowLoading(authorUuid, false);
    }
  };

  // ✅ 加载评论列表（使用 store）
  const loadComments = async () => {
    try {
      setCommentsLoading(momentUuid, true);
      console.log('loadComments - momentUuid:', momentUuid);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      if (!momentUuid) {
        console.error('momentUuid 不存在');
        return;
      }

      const response = await userApi.getComments(momentUuid, {}, token);
      if (response.status) {
        setComments(momentUuid, response.data.list || []);
      } else {
        Alert.alert('错误', response.message || '加载评论失败');
      }
    } catch (error) {
      console.error('加载评论失败:', error);
      Alert.alert('错误', '加载评论失败');
    } finally {
      setCommentsLoading(momentUuid, false);
    }
  };

  // ✅ 提交评论（使用 store）
  const submitComment = async () => {
    if (!commentText.trim()) {
      Alert.alert('提示', '请输入评论内容');
      return;
    }

    try {
      setCommentSubmitting(momentUuid, true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      const response = await userApi.addComment(momentUuid, commentText.trim(), token);
      if (response.status) {
        clearCommentText(momentUuid);
        loadComments();
        // ✅ 更新评论数
        updateMomentDetail(momentUuid, {
          comments_count: response.data.comments_count
        });
      } else {
        Alert.alert('错误', response.message || '评论失败');
      }
    } catch (error) {
      console.error('提交评论失败:', error);
      Alert.alert('错误', '评论失败，请重试');
    } finally {
      setCommentSubmitting(momentUuid, false);
    }
  };

  // ✅ 点赞功能（使用 store，乐观更新）
  const handleLike = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      // ✅ 乐观更新UI
      const isLiked = momentData.is_liked;
      const oldData = { ...momentData };
      updateMomentDetail(momentUuid, {
        is_liked: !isLiked,
        likes_count: isLiked ? momentData.likes_count - 1 : momentData.likes_count + 1
      });

      // 调用API
      const response = await userApi.likeMoment(momentUuid, token);
      
      if (!response.status) {
        // ✅ 如果失败，回滚UI
        updateMomentDetail(momentUuid, {
          is_liked: oldData.is_liked,
          likes_count: oldData.likes_count
        });
        Alert.alert('错误', response.message || '点赞失败');
      } else {
        // ✅ 更新UI状态
        updateMomentDetail(momentUuid, {
          is_liked: response.data.is_liked,
          likes_count: response.data.likes_count
        });
      }
    } catch (error) {
      console.error('点赞失败:', error);
      // ✅ 回滚UI（使用保存的旧数据）
      const oldData = momentDetail.data || moment;
      updateMomentDetail(momentUuid, {
        is_liked: oldData.is_liked,
        likes_count: oldData.likes_count
      });
      Alert.alert('错误', '网络错误，请重试');
    }
  };

  // 格式化时间
  const formatTime = (dateString) => {
    if (!dateString) return '';
    
    try {
      // 处理不同的时间格式
      let date;
      if (typeof dateString === 'string') {
        // 如果是 ISO 格式的字符串，直接解析
        date = new Date(dateString);
      } else if (dateString instanceof Date) {
        date = dateString;
      } else {
        return '';
      }

      // 检查日期是否有效
      if (isNaN(date.getTime())) {
        console.error('无效的日期:', dateString);
        return '';
      }

      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 1) return '刚刚';
      if (diffMins < 60) return `${diffMins}分钟前`;
      if (diffHours < 24) return `${diffHours}小时前`;
      if (diffDays < 7) return `${diffDays}天前`;
      
      // 格式化为本地日期时间
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch (error) {
      console.error('formatTime 错误:', error, dateString);
      return '';
    }
  };

  // ✅ 预览图片（使用 store）
  const handlePreviewImage = (imageUri, index = 0) => {
    const images = momentData?.images || [];
    showImageViewer(images, index);
  };

  // ✅ 刷新（使用 store）
  const onRefresh = () => {
    setMomentDetailRefreshing(momentUuid, true);
    loadComments();
    setTimeout(() => setMomentDetailRefreshing(momentUuid, false), 1000);
  };

  // 如果momentData不存在，显示加载中
  if (!momentData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>动态详情</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* 头部导航 */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>动态详情</Text>
        <TouchableOpacity style={styles.moreButton}>
          <Text style={styles.moreIcon}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* 动态内容 */}
        <View style={styles.momentCard}>
          <View style={styles.momentHeader}>
            <View style={styles.userInfo}>
              <TouchableOpacity onPress={() => momentData?.author?.uuid && navigation.navigate('UserProfile', { userUuid: momentData.author.uuid })}>
                <Text style={styles.userAvatar}>👤</Text>
              </TouchableOpacity>
              <View>
                <TouchableOpacity onPress={() => momentData?.author?.uuid && navigation.navigate('UserProfile', { userUuid: momentData.author.uuid })}>
                  <Text style={styles.userName}>{momentData?.author?.nickname || '未知用户'}</Text>
                </TouchableOpacity>
                <Text style={styles.time}>{formatTime(momentData?.created_at)}</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={[styles.followButton, isFollowing && styles.followingButton]}
              onPress={handleFollow}
              disabled={isFollowLoading}
            >
              <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                {isFollowLoading ? '...' : (isFollowing ? '已关注' : '关注')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.content}>{momentData?.content || '内容加载中...'}</Text>

          {/* 图片展示 */}
          {momentData?.images && momentData.images.length > 0 && (
            <View style={styles.imagesContainer}>
              {momentData.images.map((img, index) => (
                <TouchableOpacity 
                  key={index} 
                  onPress={() => handlePreviewImage(img, index)}
                >
                  <Image source={{ uri: img }} style={styles.image} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 互动按钮 */}
          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleLike}
            >
              <Text style={[styles.actionIcon, momentData.is_liked && styles.likedIcon]}>
                {momentData.is_liked ? '❤️' : '🤍'}
              </Text>
              <Text style={[styles.actionText, momentData.is_liked && styles.likedText]}>
                {momentData.likes_count}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>💬</Text>
              <Text style={styles.actionText}>评论</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>👋</Text>
              <Text style={styles.actionText}>打招呼</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
              <Text style={styles.actionIcon}>🎁</Text>
              <Text style={styles.actionText}>送礼</Text>
            </TouchableOpacity>
          </View>

          {/* 送礼提示 */}
          <View style={styles.giftPrompt}>
            <Text style={styles.giftIcon}>🎁</Text>
            <Text style={styles.giftText}>虚位以待,快送上礼物吧</Text>
            <Text style={styles.giftArrow}>›</Text>
          </View>
        </View>

        {/* 评论区域 */}
        <View style={styles.commentSection}>
          <Text style={styles.commentTitle}>评论</Text>
          
          {(!comments || comments.length === 0) ? (
            <View style={styles.emptyComments}>
              <Text style={styles.emptyCommentIcon}>💬</Text>
              <Text style={styles.emptyCommentText}>还没有评论,来和TA互动一下吧~</Text>
            </View>
          ) : (
            <View style={styles.commentList}>
              {comments.map((comment, index) => (
                <View key={index} style={styles.commentItem}>
                  <Text style={styles.commentAvatar}>👤</Text>
                  <View style={styles.commentContent}>
                    <Text style={styles.commentAuthor}>{comment.author.nickname}</Text>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* 评论输入框 */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="说点好听的,遇见有趣的"
          value={commentText}
          onChangeText={(text) => setCommentText(momentUuid, text)}
          multiline
          maxLength={200}
        />
        <TouchableOpacity 
          style={[styles.sendButton, (!commentText.trim() || isSubmittingComment) && styles.sendButtonDisabled]}
          onPress={submitComment}
          disabled={!commentText.trim() || isSubmittingComment}
        >
          <Text style={[styles.sendButtonText, (!commentText.trim() || isSubmittingComment) && styles.sendButtonTextDisabled]}>
            发送
          </Text>
        </TouchableOpacity>
      </View>

      {/* ✅ 图片查看器（使用 store） */}
      <ImageViewing
        images={imageViewer.images.map(uri => ({ uri }))}
        imageIndex={imageViewer.currentIndex}
        visible={imageViewer.visible}
        onRequestClose={hideImageViewer}
        enableSwipeDown={true}
        swipeDownThreshold={50}
        backgroundColor="rgba(0, 0, 0, 0.9)"
        doubleTapToZoomEnabled={true}
        enablePreload={true}
        presentationStyle="overFullScreen"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 5,
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  moreButton: {
    padding: 5,
  },
  moreIcon: {
    fontSize: 20,
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  momentCard: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  momentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    fontSize: 50,
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  time: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followingButton: {
    backgroundColor: '#E0E0E0',
  },
  followButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  followingButtonText: {
    color: '#666',
  },
  content: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    marginBottom: 15,
  },
  imagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  image: {
    width: (width - 90) / 3,
    height: (width - 90) / 3,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
  },
  actionIcon: {
    fontSize: 20,
    marginRight: 5,
  },
  actionText: {
    fontSize: 14,
    color: '#666',
  },
  likedIcon: {
    // 已点赞的图标样式
  },
  likedText: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  giftPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
  },
  giftIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  giftText: {
    flex: 1,
    fontSize: 14,
    color: '#FF6B6B',
  },
  giftArrow: {
    fontSize: 18,
    color: '#FF6B6B',
  },
  commentSection: {
    backgroundColor: 'white',
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  commentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyComments: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyCommentIcon: {
    fontSize: 60,
    marginBottom: 15,
    opacity: 0.3,
  },
  emptyCommentText: {
    fontSize: 16,
    color: '#999',
  },
  commentList: {
    // 评论列表样式
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  commentAvatar: {
    fontSize: 30,
    marginRight: 10,
  },
  commentContent: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  commentText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
    marginBottom: 5,
  },
  commentTime: {
    fontSize: 12,
    color: '#999',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    fontSize: 14,
    maxHeight: 100,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sendButtonTextDisabled: {
    color: '#999',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewCloseText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  imagePreview: {
    width: width * 0.9,
    height: width * 0.9,
  },
});
