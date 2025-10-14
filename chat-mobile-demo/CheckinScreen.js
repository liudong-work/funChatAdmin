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

  // 渲染本周签到日历（花瓣样式）
  const renderWeekCalendar = () => {
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    const today = new Date().getDay();
    const continuousDays = pointsInfo?.continuous_days || 0;
    const lastCheckinDate = pointsInfo?.last_checkin_date;
    const todayCheckedIn = pointsInfo?.is_checked_in_today;

    return (
      <View style={styles.calendarContainer}>
        <Text style={styles.calendarTitle}>本周签到</Text>
        <View style={styles.flowerContainer}>
          <View style={styles.flowerCenter}>
            <Text style={styles.flowerCenterText}>签到</Text>
          </View>
          <View style={styles.petalsContainer}>
            {days.map((day, index) => {
              const isToday = index === today;
              const isChecked = isToday && todayCheckedIn;
              
              return (
                <View key={index} style={[
                  styles.petal,
                  { transform: [{ rotate: `${index * 51.4}deg` }] }
                ]}>
                  <View style={[
                    styles.petalInner,
                    isChecked && styles.petalChecked,
                    isToday && !isChecked && styles.petalToday
                  ]}>
                    <Text style={[
                      styles.petalText,
                      isChecked && styles.petalTextChecked
                    ]}>
                      {day}
                    </Text>
                    {isChecked && <Text style={styles.petalCheckMark}>✓</Text>}
                  </View>
                </View>
              );
            })}
          </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* 头部卡片 */}
        <View style={styles.headerCard}>
          <View style={styles.pointsInfo}>
            <Text style={styles.pointsLabel}>我的积分</Text>
            <Text style={styles.pointsValue}>{pointsInfo?.points || 0}</Text>
            <Text style={styles.totalPoints}>
              累计获得 {pointsInfo?.total_points || 0} 积分
            </Text>
          </View>
          
          <View style={styles.streakInfo}>
            <Text style={styles.streakLabel}>连续签到</Text>
            <Text style={styles.streakValue}>{pointsInfo?.continuous_days || 0}</Text>
            <Text style={styles.streakUnit}>天</Text>
          </View>
        </View>

        {/* 签到按钮 */}
        <TouchableOpacity
          style={[
            styles.checkinButton,
            (pointsInfo?.is_checked_in_today || checking) && styles.checkinButtonDisabled
          ]}
          onPress={handleCheckin}
          disabled={pointsInfo?.is_checked_in_today || checking}
        >
          {checking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.checkinButtonText}>
                {pointsInfo?.is_checked_in_today ? '今日已签到' : '立即签到'}
              </Text>
              {!pointsInfo?.is_checked_in_today && (
                <Text style={styles.checkinButtonSubtext}>每日可获得 5 积分</Text>
              )}
            </>
          )}
        </TouchableOpacity>

        {/* 本周签到日历 */}
        {renderWeekCalendar()}

        {/* 签到奖励规则 */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>签到奖励规则</Text>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>🎁</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleText}>每日签到</Text>
              <Text style={styles.ruleSubtext}>获得 5 积分</Text>
            </View>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>⭐</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleText}>连续签到 3 天</Text>
              <Text style={styles.ruleSubtext}>额外奖励 5 积分</Text>
            </View>
          </View>
          <View style={styles.ruleItem}>
            <Text style={styles.ruleIcon}>🌟</Text>
            <View style={styles.ruleContent}>
              <Text style={styles.ruleText}>连续签到 7 天</Text>
              <Text style={styles.ruleSubtext}>额外奖励 10 积分</Text>
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
    backgroundColor: '#f5f5f5',
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
  headerCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  pointsInfo: {
    flex: 1,
  },
  pointsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3b82f6',
    marginBottom: 4,
  },
  totalPoints: {
    fontSize: 12,
    color: '#999',
  },
  streakInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 24,
    borderLeftWidth: 1,
    borderLeftColor: '#e5e7eb',
  },
  streakLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  streakUnit: {
    fontSize: 12,
    color: '#999',
  },
  checkinButton: {
    backgroundColor: '#3b82f6',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  checkinButtonDisabled: {
    backgroundColor: '#9ca3af',
    shadowColor: '#000',
    shadowOpacity: 0.1,
  },
  checkinButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  checkinButtonSubtext: {
    fontSize: 14,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  calendarContainer: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  flowerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
    position: 'relative',
  },
  flowerCenter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f8fafc',
    borderWidth: 3,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flowerCenterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  petalsContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petal: {
    position: 'absolute',
    width: 40,
    height: 60,
    alignItems: 'center',
    justifyContent: 'flex-start',
    top: 10,
  },
  petalInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  petalChecked: {
    backgroundColor: '#3b82f6',
    borderColor: '#2563eb',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.3,
  },
  petalToday: {
    borderColor: '#3b82f6',
    borderWidth: 3,
  },
  petalText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
  },
  petalTextChecked: {
    color: '#fff',
  },
  petalCheckMark: {
    position: 'absolute',
    fontSize: 12,
    color: '#fff',
    fontWeight: 'bold',
    top: -2,
    right: -2,
  },
  rulesCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  rulesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  ruleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  ruleContent: {
    flex: 1,
  },
  ruleText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  ruleSubtext: {
    fontSize: 12,
    color: '#666',
  },
});

export default CheckinScreen;

