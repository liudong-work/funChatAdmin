import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Animated, Dimensions, TextInput, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bottleApi } from './services/apiService.js';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [isFishing, setIsFishing] = useState(false);
  const [isThrowing, setIsThrowing] = useState(false);
  const [bottles, setBottles] = useState([]);
  const [currentBottle, setCurrentBottle] = useState(null);
  const [showThrowModal, setShowThrowModal] = useState(false);
  const [throwMessage, setThrowMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  
  // 动画值
  const bottleFloat = useRef(new Animated.Value(0)).current;
  const fishingRod = useRef(new Animated.Value(0)).current;
  const bottleScale = useRef(new Animated.Value(1)).current;
  const bottleOpacity = useRef(new Animated.Value(1)).current;
  
  // 扔瓶子动画值
  const throwBottle = useRef(new Animated.Value(0)).current;
  const throwScale = useRef(new Animated.Value(1)).current;

  // 瓶子漂浮动画
  useEffect(() => {
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleFloat, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleFloat, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    floatAnimation.start();

    return () => floatAnimation.stop();
  }, []);

  // 捞瓶子动画
  const startFishing = async () => {
    if (requesting) return;
    setRequesting(true);
    setIsFishing(true);

    // 钓鱼竿动画
    Animated.sequence([
      Animated.timing(fishingRod, { toValue: 1, duration: 800, useNativeDriver: true }),
      Animated.timing(fishingRod, { toValue: 0, duration: 800, useNativeDriver: true }),
    ]).start();

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('提示', '请先登录');
        return;
      }
      const res = await bottleApi.fishBottle(token);
      if (res.status && res.data) {
        const apiBottle = {
          id: res.data.uuid,
          message: res.data.content,
          author: res.data.sender_nickname || '陌生人',
          mood: res.data.mood || '🍀',
          sender_uuid: res.data.sender_uuid,
        };
        setCurrentBottle(apiBottle);

        // 瓶子出现动画
        bottleScale.setValue(0);
        bottleOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(bottleScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }),
          Animated.timing(bottleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ]).start();
      } else {
        Alert.alert('提示', res.message || '暂时没有可捞的瓶子');
      }
    } catch (e) {
      Alert.alert('错误', '捞瓶子失败，请稍后再试');
    } finally {
      setIsFishing(false);
      setRequesting(false);
    }
  };

  // 重新捞瓶子
  const resetFishing = () => {
    setCurrentBottle(null);
    bottleScale.setValue(1);
    bottleOpacity.setValue(1);
  };

  // 扔瓶子功能
  const startThrowing = () => {
    setShowThrowModal(true);
  };

  const throwBottleToOcean = async () => {
    if (!throwMessage.trim() || throwMessage.trim().length < 6 || requesting) return;
    setRequesting(true);
    setIsThrowing(true);
    setShowThrowModal(false);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('提示', '请先登录');
        return;
      }
      const res = await bottleApi.throwBottle(throwMessage.trim(), '', token);
      if (res.status) {
        Alert.alert('成功', '已经把你的心声扔进大海');
      } else {
        Alert.alert('提示', res.message || '扔瓶子失败');
      }
    } catch (e) {
      Alert.alert('错误', '扔瓶子失败，请稍后再试');
    } finally {
      // 扔瓶子动画
      Animated.sequence([
        Animated.timing(throwBottle, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(throwScale, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]).start(() => {
        setIsThrowing(false);
        throwBottle.setValue(0);
        throwScale.setValue(1);
        setThrowMessage('');
      });
      setRequesting(false);
    }
  };

  const cancelThrowing = () => {
    setShowThrowModal(false);
    setThrowMessage('');
  };


  // 瓶子漂浮变换
  const bottleTransform = bottleFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  // 钓鱼竿变换
  const rodTransform = fishingRod.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30],
  });

  // 扔瓶子变换
  const throwTransform = throwBottle.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -200],
  });

  return (
    <View style={styles.container}>
      {/* 海洋背景 */}
      <View style={styles.backgroundContainer}>
        {/* 天空渐变背景 */}
        <View style={styles.skyGradient} />
        
        {/* 海洋渐变背景 */}
        <View style={styles.oceanGradient} />
        
        
        {/* 漂浮的瓶子装饰 */}
        <Animated.View 
          style={[
            styles.floatingBottles,
            {
              transform: [{ translateY: bottleTransform }],
            }
          ]}
        >
          <Text style={styles.bottleEmoji}>🍾</Text>
          <Text style={styles.bottleEmoji}>🍾</Text>
          <Text style={styles.bottleEmoji}>🍾</Text>
        </Animated.View>
      </View>

      {/* 标题 */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>🌊 漂流瓶</Text>
        <Text style={styles.subtitle}>把心事装进瓶子，让大海传递</Text>
      </View>

      {/* 功能按钮 */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.throwButton]}
          onPress={startThrowing}
          disabled={isThrowing}
        >
          <Text style={styles.buttonIcon}>🍾</Text>
          <Text style={styles.buttonText}>
            {isThrowing ? '正在扔瓶子...' : '扔瓶子'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.fishButton]}
          onPress={startFishing}
          disabled={isFishing}
        >
          <Text style={styles.buttonIcon}>🍾</Text>
          <Text style={styles.buttonText}>
            {isFishing ? '正在捞瓶子...' : '捞瓶子'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 捞到的瓶子 */}
      {currentBottle && (
        <Animated.View 
          style={[
            styles.bottleCard,
            {
              transform: [{ scale: bottleScale }],
              opacity: bottleOpacity,
            }
          ]}
        >
          <View style={styles.bottleHeader}>
            <Text style={styles.bottleIcon}>🍾</Text>
            <Text style={styles.bottleTitle}>捞到一个瓶子！</Text>
          </View>
          
          <View style={styles.bottleContent}>
            <Text style={styles.bottleMood}>{currentBottle.mood}</Text>
            <Text style={styles.bottleMessage}>"{currentBottle.message}"</Text>
            <Text style={styles.bottleAuthor}>— {currentBottle.author}</Text>
          </View>

          <View style={styles.bottleActions}>
            <TouchableOpacity
              style={styles.replyButton}
              onPress={() => {
                if (!currentBottle) return;
                const chatUser = {
                  id: currentBottle.sender_uuid || Date.now(),
                  name: currentBottle.author || '陌生人',
                  avatar: '👤',
                  sender_uuid: currentBottle.sender_uuid,
                  bottleMessage: currentBottle.message,
                };
                // 不关闭弹窗，让用户可以继续看到瓶子内容
                // setCurrentBottle(null); // 注释掉这行
                // ChatDetail 在 Messages 栈中，需通过父Tab跳到嵌套栈的目标页
                navigation && navigation.navigate && navigation.navigate('Messages', {
                  screen: 'ChatDetail',
                  params: { user: chatUser },
                });
              }}
            >
              <Text style={styles.replyButtonText}>回复</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.throwBackButton} onPress={resetFishing}>
              <Text style={styles.throwBackButtonText}>重新捞瓶子</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* 扔瓶子模态框 */}
      {showThrowModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🍾 扔一个瓶子到海里</Text>
            

            <View style={styles.messageInput}>
              <Text style={styles.inputLabel}>写下你的心声：</Text>
              <TextInput
                style={styles.textInput}
                placeholder="分享你的心情、想法或故事...（至少6个字）"
                value={throwMessage}
                onChangeText={setThrowMessage}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Text style={[styles.charCount, throwMessage.trim().length < 6 && styles.charCountWarning]}>
                {throwMessage.length}/200 {throwMessage.trim().length < 6 ? `(至少需要6个字)` : ''}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={cancelThrowing}>
                <Text style={styles.cancelButtonText}>取消</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmButton, (!throwMessage.trim() || throwMessage.trim().length < 6) && styles.confirmButtonDisabled]}
                onPress={throwBottleToOcean}
                disabled={!throwMessage.trim() || throwMessage.trim().length < 6}
              >
                <Text style={styles.confirmButtonText}>🌊 扔到海里</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* 扔瓶子动画 */}
      {isThrowing && (
        <Animated.View 
          style={[
            styles.throwingBottle,
            {
              transform: [
                { translateY: throwTransform },
                { scale: throwScale }
              ],
            }
          ]}
        >
          <Text style={styles.throwingBottleEmoji}>🍾</Text>
        </Animated.View>
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  // 背景容器
  backgroundContainer: {
    flex: 1,
    position: 'relative',
  },
  
  // 天空渐变
  skyGradient: {
    flex: 1,
    backgroundColor: '#87CEEB', // Sky blue
  },
  
  // 海洋渐变
  oceanGradient: {
    height: height * 0.4,
    backgroundColor: '#1E88E5', // Ocean blue
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  
  
  // 漂浮的瓶子
  floatingBottles: {
    position: 'absolute',
    top: height * 0.6 - 20, // 海平面上方一点
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  bottleEmoji: {
    fontSize: 40,
    opacity: 0.6,
  },
  
  // 标题区域
  titleContainer: {
    position: 'absolute',
    top: height * 0.15,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: 'white',
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 按钮容器
  buttonContainer: {
    position: 'absolute',
    top: height * 0.4,
    right: 20,
    flexDirection: 'column',
    gap: 20,
  },
  
  // 功能按钮
  actionButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  throwButton: {
    backgroundColor: '#4CAF50', // Green for throw
  },
  fishButton: {
    backgroundColor: '#FF9800', // Orange for fish
  },
  buttonIcon: {
    fontSize: 30,
    marginBottom: 4,
  },
  buttonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  
  // 捞到的瓶子卡片
  bottleCard: {
    position: 'absolute',
    top: height * 0.3,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    overflow: 'hidden',
  },
  bottleHeader: {
    backgroundColor: '#81C784',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bottleIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  bottleTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottleContent: {
    padding: 20,
    alignItems: 'center',
  },
  bottleMood: {
    fontSize: 40,
    marginBottom: 15,
  },
  bottleMessage: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  bottleAuthor: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  bottleActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#F5F5F5',
  },
  replyButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
  },
  replyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  throwBackButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 20,
    marginLeft: 10,
    alignItems: 'center',
  },
  throwBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 模态框样式
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  
  
  // 消息输入
  messageInput: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
  },
  charCountWarning: {
    color: '#FF5722',
    fontWeight: 'bold',
  },
  
  // 模态框操作按钮
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: 'bold',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 20,
    marginLeft: 10,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  // 扔瓶子动画
  throwingBottle: {
    position: 'absolute',
    top: 100,
    left: width / 2 - 20,
    zIndex: 999,
  },
  throwingBottleEmoji: {
    fontSize: 40,
  },
});
