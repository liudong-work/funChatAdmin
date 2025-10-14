import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  ScrollView,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pointsApi } from './services/apiService';

const { width } = Dimensions.get('window');

const CheckinScreen = ({ navigation }) => {
  const [pointsInfo, setPointsInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadPointsInfo();
  }, []);

  const loadPointsInfo = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('提示', '请先登录');
        return;
      }

      const response = await pointsApi.getPointsInfo(token);
      if (response && response.status) {
        setPointsInfo(response.data);
      }
    } catch (error) {
      console.error('获取积分信息失败:', error);
      Alert.alert('错误', '获取积分信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (pointsInfo?.is_checked_in_today) {
      Alert.alert('提示', '今天已经签到过了');
      return;
    }

    try {
      setChecking(true);
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('提示', '请先登录');
        return;
      }

      const response = await pointsApi.checkin(token);
      if (response && response.status) {
        const { points_earned, continuous_days, bonus_message } = response.data;
        
        let message = `签到成功！获得 ${points_earned} 积分`;
        if (continuous_days > 1) {
          message += `\n已连续签到 ${continuous_days} 天`;
        }
        if (bonus_message) {
          message += `\n${bonus_message}`;
        }

        Alert.alert('签到成功', message, [
          {
            text: '确定',
            onPress: () => loadPointsInfo()
          }
        ]);
      } else {
        Alert.alert('失败', response?.message || '签到失败，请重试');
      }
    } catch (error) {
      console.error('签到失败:', error);
      Alert.alert('错误', '网络错误，请检查网络连接');
    } finally {
      setChecking(false);
    }
  };

  // 渲染本周签到日历（任务中心风格）
  const renderWeekCalendar = () => {
    const days = ['今天', '明天', '10/16', '10/17', '10/18', '10/19', '10/20'];
    const rewards = ['✓', '+20', '🎁', '+40', '+50', '🎁', '🎁'];
    const today = 0; // 今天是第一个
    const todayCheckedIn = pointsInfo?.is_checked_in_today;

    return (
      <View style={styles.calendarContainer}>
        <View style={styles.weekDays}>
          {days.map((day, index) => {
            const isToday = index === today;
            const isChecked = isToday && todayCheckedIn;
            
            return (
              <View key={index} style={styles.dayItem}>
                <View style={[
                  styles.dayCircle,
                  isChecked && styles.checkedCircle,
                  isToday && !isChecked && styles.todayCircle
                ]}>
                  {isChecked ? (
                    <Text style={styles.checkMark}>✓</Text>
                  ) : (
                    <Text style={styles.rewardIcon}>
                      {index === 1 ? '🐚' : index === 3 ? '🐚' : index === 4 ? '🐚' : '🎁'}
                    </Text>
                  )}
                </View>
                <Text style={styles.dayText}>{day}</Text>
                <Text style={styles.rewardText}>{rewards[index]}</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#3b82f6" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 货币显示栏 */}
        <View style={styles.currencyBar}>
          <View style={styles.currencyItem}>
            <Text style={styles.starIcon}>⭐</Text>
            <Text style={styles.currencyValue}>0</Text>
          </View>
          <View style={styles.currencyItem}>
            <Text style={styles.shellIcon}>🐚</Text>
            <Text style={styles.currencyValue}>{pointsInfo?.points || 0}</Text>
          </View>
        </View>

        {/* 签到卡片 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>签到 (1/7)</Text>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionButton}>
                <Text style={styles.actionButtonText}>补签列表</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.actionButton,
                  styles.checkinButton,
                  (pointsInfo?.is_checked_in_today || checking) && styles.checkinButtonDisabled
                ]}
                onPress={handleCheckin}
                disabled={pointsInfo?.is_checked_in_today || checking}
              >
                {checking ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.checkinButtonText}>
                    {pointsInfo?.is_checked_in_today ? '已签到' : '立即签到'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          <Text style={styles.streakText}>
            已经连续签到{pointsInfo?.continuous_days || 0}天
          </Text>

          {/* 签到日历 */}
          {renderWeekCalendar()}
        </View>

        {/* 宝箱奖励卡片 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>宝箱 (0/5)</Text>
            <Text style={styles.activityValue}>当前活跃值0</Text>
          </View>
          
          <View style={styles.treasureProgress}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: '0%' }]} />
              {[30, 60, 100, 150, 200].map((value, index) => (
                <View key={index} style={[
                  styles.treasureChest,
                  { left: `${(index * 25)}%` }
                ]}>
                  <Text style={styles.chestIcon}>📦</Text>
                  <Text style={styles.chestValue}>{value}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 任务卡片 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>任务 (0/3)</Text>
          </View>
          
          <View style={styles.taskList}>
            <View style={styles.taskItem}>
              <Text style={styles.taskIcon}>🏠</Text>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>每日签到</Text>
                <Text style={styles.taskReward}>贝壳+5 经验值+10</Text>
              </View>
              <TouchableOpacity style={styles.taskButton}>
                <Text style={styles.taskButtonText}>去完成</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.taskItem}>
              <Text style={styles.taskIcon}>💬</Text>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>发送1条消息</Text>
                <Text style={styles.taskReward}>贝壳+10 经验值+20</Text>
              </View>
              <TouchableOpacity style={styles.taskButton}>
                <Text style={styles.taskButtonText}>去完成</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.taskItem}>
              <Text style={styles.taskIcon}>🌊</Text>
              <View style={styles.taskContent}>
                <Text style={styles.taskTitle}>扔1个漂流瓶</Text>
                <Text style={styles.taskReward}>贝壳+15 经验值+30</Text>
              </View>
              <TouchableOpacity style={styles.taskButton}>
                <Text style={styles.taskButtonText}>去完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f8',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  currencyBar: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  shellIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  currencyValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#64748b',
  },
  checkinButton: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkinButtonDisabled: {
    backgroundColor: '#9ca3af',
    borderColor: '#9ca3af',
  },
  checkinButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  streakText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  activityValue: {
    fontSize: 12,
    color: '#666',
  },
  calendarContainer: {
    marginTop: 8,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayItem: {
    alignItems: 'center',
    flex: 1,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  todayCircle: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  checkedCircle: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  checkMark: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  rewardIcon: {
    fontSize: 16,
  },
  dayText: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    textAlign: 'center',
  },
  rewardText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  treasureProgress: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fbbf24',
    borderRadius: 4,
  },
  treasureChest: {
    position: 'absolute',
    top: -12,
    alignItems: 'center',
    transform: [{ translateX: -12 }],
  },
  chestIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  chestValue: {
    fontSize: 10,
    color: '#666',
    fontWeight: '500',
  },
  taskList: {
    marginTop: 8,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  taskIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  taskReward: {
    fontSize: 12,
    color: '#666',
  },
  taskButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  taskButtonText: {
    fontSize: 12,
    color: '#3b82f6',
  },
});

export default CheckinScreen;

