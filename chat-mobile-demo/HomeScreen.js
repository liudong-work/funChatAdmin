import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  TextInput,
  Modal,
  Animated,
  StatusBar,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bottleApi, bottleConfigApi } from './services/apiService';
import { useAuthStore } from './stores';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  // 使用 Zustand 状态管理
  const user = useAuthStore(state => state.user);
  const token = useAuthStore(state => state.token);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bottleMessage, setBottleMessage] = useState('');
  const [foundBottle, setFoundBottle] = useState(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  const [availableBottle, setAvailableBottle] = useState(null);
  const [availableBottles, setAvailableBottles] = useState([]); // 存储多个瓶子
  
  // 捞瓶子次数限制相关状态
  const [freeFishCount, setFreeFishCount] = useState(3); // 免费捞瓶子次数
  const [usedFishCount, setUsedFishCount] = useState(0); // 已使用的捞瓶子次数
  const [fishCountLoaded, setFishCountLoaded] = useState(false); // 是否已加载次数配置
  
  // 扔瓶子次数限制相关状态
  const [freeThrowCount, setFreeThrowCount] = useState(5); // 免费扔瓶子次数
  const [usedThrowCount, setUsedThrowCount] = useState(0); // 已使用的扔瓶子次数
  const [throwCountLoaded, setThrowCountLoaded] = useState(false); // 是否已加载扔瓶子次数配置
  
  // 用户性别
  const [userGender, setUserGender] = useState(null); // 用户性别
  
  // 动画值
  const bottleFloat = useRef(new Animated.Value(0)).current;
  const bottleMove = useRef(new Animated.Value(0)).current;
  const bottleRotate = useRef(new Animated.Value(0)).current;

  // 组件挂载时加载配置
  useEffect(() => {
    loadUserGender();
    loadFishCountConfig();
    loadThrowCountConfig();
    loadUsedFishCount();
    loadUsedThrowCount();
  }, []);

  // 加载用户性别
  const loadUserGender = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const user = JSON.parse(userInfoStr);
        setUserGender(user.gender || null);
        console.log('[Gender] 用户性别:', user.gender || '未设置');
      }
    } catch (error) {
      console.error('[Gender] 加载用户性别失败:', error);
    }
  };

  // 加载捞瓶子次数配置
  const loadFishCountConfig = async () => {
    try {
      console.log('[FishCount] 开始加载捞瓶子次数配置...');
      console.log('[FishCount] bottleConfigApi:', bottleConfigApi);
      
      if (!bottleConfigApi) {
        console.error('[FishCount] bottleConfigApi 未定义');
        setFreeFishCount(3);
        setFishCountLoaded(true);
        return;
      }
      
      const response = await bottleConfigApi.getFreeFishCount(userGender);
      
      if (response && response.status) {
        const count = response.data?.free_fish_count || 3;
        setFreeFishCount(count);
        console.log('[FishCount] 免费捞瓶子次数配置加载成功:', count, '性别:', response.data?.gender);
      } else {
        console.warn('[FishCount] 配置加载失败，使用默认值:', response?.message);
        setFreeFishCount(3); // 使用默认值
      }
    } catch (error) {
      console.error('[FishCount] 配置加载异常:', error);
      setFreeFishCount(3); // 使用默认值
    } finally {
      setFishCountLoaded(true);
    }
  };

  // 加载扔瓶子次数配置
  const loadThrowCountConfig = async () => {
    try {
      console.log('[ThrowCount] 开始加载扔瓶子次数配置...');
      
      if (!bottleConfigApi) {
        console.error('[ThrowCount] bottleConfigApi 未定义');
        setFreeThrowCount(5);
        setThrowCountLoaded(true);
        return;
      }
      
      const response = await bottleConfigApi.getFreeThrowCount(userGender);
      
      if (response && response.status) {
        const count = response.data?.free_throw_count || 5;
        setFreeThrowCount(count);
        console.log('[ThrowCount] 免费扔瓶子次数配置加载成功:', count, '性别:', response.data?.gender);
      } else {
        console.warn('[ThrowCount] 配置加载失败，使用默认值:', response?.message);
        setFreeThrowCount(5); // 使用默认值
      }
    } catch (error) {
      console.error('[ThrowCount] 配置加载异常:', error);
      setFreeThrowCount(5); // 使用默认值
    } finally {
      setThrowCountLoaded(true);
    }
  };

  // 加载已使用的捞瓶子次数
  const loadUsedFishCount = async () => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem('usedFishCount');
      const data = stored ? JSON.parse(stored) : {};
      
      if (data.date === today) {
        setUsedFishCount(data.count || 0);
        console.log('[FishCount] 今日已使用捞瓶子次数:', data.count || 0);
      } else {
        // 新的一天，重置计数
        setUsedFishCount(0);
        await AsyncStorage.setItem('usedFishCount', JSON.stringify({ date: today, count: 0 }));
        console.log('[FishCount] 新的一天，重置捞瓶子次数');
      }
    } catch (error) {
      console.error('[FishCount] 加载已使用次数失败:', error);
      setUsedFishCount(0);
    }
  };

  // 保存已使用的捞瓶子次数
  const saveUsedFishCount = async (count) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('usedFishCount', JSON.stringify({ date: today, count }));
      setUsedFishCount(count);
      console.log('[FishCount] 保存已使用捞瓶子次数:', count);
    } catch (error) {
      console.error('[FishCount] 保存已使用次数失败:', error);
    }
  };

  // 加载已使用的扔瓶子次数
  const loadUsedThrowCount = async () => {
    try {
      const today = new Date().toDateString();
      const stored = await AsyncStorage.getItem('usedThrowCount');
      const data = stored ? JSON.parse(stored) : {};
      
      if (data.date === today) {
        setUsedThrowCount(data.count || 0);
        console.log('[ThrowCount] 今日已使用扔瓶子次数:', data.count || 0);
      } else {
        // 新的一天，重置计数
        setUsedThrowCount(0);
        await AsyncStorage.setItem('usedThrowCount', JSON.stringify({ date: today, count: 0 }));
        console.log('[ThrowCount] 新的一天，重置扔瓶子次数');
      }
    } catch (error) {
      console.error('[ThrowCount] 加载已使用次数失败:', error);
      setUsedThrowCount(0);
    }
  };

  // 保存已使用的扔瓶子次数
  const saveUsedThrowCount = async (count) => {
    try {
      const today = new Date().toDateString();
      await AsyncStorage.setItem('usedThrowCount', JSON.stringify({ date: today, count }));
      setUsedThrowCount(count);
      console.log('[ThrowCount] 保存已使用扔瓶子次数:', count);
    } catch (error) {
      console.error('[ThrowCount] 保存已使用次数失败:', error);
    }
  };

  // 检查是否有可捞的瓶子
  const checkAvailableBottles = async () => {
    try {
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        console.log('用户未登录，不检查瓶子');
        setAvailableBottle(null);
        setAvailableBottles([]);
        return;
      }

      console.log('开始检查可用瓶子...');
      const response = await bottleApi.checkBottle(token);
      console.log('瓶子检查响应:', response);
      
      if (response && response.status && response.hasBottle) {
        // 处理多个瓶子
        if (response.bottles && response.bottles.length > 0) {
          console.log(`找到 ${response.bottles.length} 个可用瓶子`);
          setAvailableBottles(response.bottles);
          // 保持兼容性，第一个瓶子作为主瓶子
          setAvailableBottle(response.bottles[0]);
        } else if (response.bottle) {
          // 兼容旧版本返回单个瓶子的情况
          console.log('找到可用瓶子:', response.bottle.message);
          setAvailableBottle(response.bottle);
          setAvailableBottles([response.bottle]);
        }
      } else {
        console.log('没有可用瓶子');
        setAvailableBottle(null);
        setAvailableBottles([]);
      }
    } catch (error) {
      console.log('检查瓶子失败:', error.message);
      // 如果是认证错误，静默处理，不显示错误
      if (error.message && error.message.includes('访问令牌无效')) {
        console.log('认证令牌无效，用户可能需要重新登录');
        setAvailableBottle(null);
        setAvailableBottles([]);
      } else {
        console.log('其他错误:', error);
        setAvailableBottle(null);
        setAvailableBottles([]);
      }
    }
  };

  // 组件加载时检查瓶子
  useEffect(() => {
    checkAvailableBottles();
  }, []);

  // 轮询检查瓶子（每30秒检查一次）
  useEffect(() => {
    const interval = setInterval(() => {
      checkAvailableBottles();
    }, 30000); // 30秒轮询一次

    return () => clearInterval(interval);
  }, []);

  // 页面获得焦点时检查瓶子
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      checkAvailableBottles();
    });

    return unsubscribe;
  }, [navigation]);

  // 瓶子漂流动画
  useEffect(() => {
    // 上下浮动动画
    const floatAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleFloat, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleFloat, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );

    // 从左向右移动动画（循环）
    const moveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleMove, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleMove, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );

    // 倾斜旋转动画
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleRotate, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleRotate, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    moveAnimation.start();
    rotateAnimation.start();
  }, []);

  // 波浪路径生成 - 使用静态路径避免动画值类型问题
  const getWavePath1 = () => `M0,${height * 0.6} Q${width * 0.25},${height * 0.6 - 15} ${width * 0.5},${height * 0.6} T${width},${height * 0.6} L${width},${height} L0,${height} Z`;
  const getWavePath2 = () => `M0,${height * 0.6} Q${width * 0.25},${height * 0.6 - 10} ${width * 0.5},${height * 0.6} T${width},${height * 0.6} L${width},${height} L0,${height} Z`;
  const getWavePath3 = () => `M0,${height * 0.6} Q${width * 0.25},${height * 0.6 - 8} ${width * 0.5},${height * 0.6} T${width},${height * 0.6} L${width},${height} L0,${height} Z`;

  // 瓶子变换 - 组合所有动画效果
  const bottleTransform = {
    transform: [
      {
        translateY: bottleFloat.interpolate({
          inputRange: [0, 1],
          outputRange: [-20, 20],
        }),
      },
      {
        translateX: bottleMove.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.35, width * 0.35],
        }),
      },
      {
        rotate: bottleRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['-15deg', '15deg'],
        }),
      },
    ],
  };

  // 捞瓶子点击事件 - 直接捞取指定的瓶子
  const handleBottleClick = async (bottle) => {
    if (!bottle) return;
    
    // 设置当前要捞的瓶子
    setAvailableBottle(bottle);
    
    // 捞取瓶子
    await fishSingleBottle();
  };

  // 捞单个瓶子的逻辑
  const fishSingleBottle = async () => {
    try {
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        return;
      }

      console.log('开始捞瓶子...');
      const response = await bottleApi.fishBottle(token);
      console.log('捞瓶子响应:', response);
      
      if (response && response.status && response.data) {
        console.log('成功捞到瓶子:', response.data);
        // 格式化瓶子数据以匹配弹窗期望的格式
        const bottleData = {
          message: response.data.content,
          mood: response.data.mood,
          sender: response.data.sender_nickname,
          sender_uuid: response.data.sender_uuid,
          time: new Date(response.data.created_at).toLocaleString('zh-CN'),
          bottleUuid: response.data.uuid
        };
        // 显示捞到的瓶子内容
        setFoundBottle(bottleData);
        // 瓶子被捞起后消失
        setAvailableBottle(null);
        setAvailableBottles([]);
        // 重新检查可用瓶子
        setTimeout(() => checkAvailableBottles(), 1000);
      } else {
        Alert.alert('失败', response?.message || '捞瓶子失败，请重试');
      }
    } catch (error) {
      console.error('捞瓶子错误:', error);
      Alert.alert('错误', '网络错误，请检查网络连接');
    }
  };

  // 扔瓶子
  const handleThrowBottle = async () => {
    if (!bottleMessage.trim()) {
      Alert.alert('提示', '请输入瓶子内容');
      return;
    }

    try {
      setIsThrowing(true);
      
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setIsThrowing(false);
        return;
      }

      console.log('[ThrowCount] 开始扔瓶子，当前已使用次数:', usedThrowCount, '总次数:', freeThrowCount);

      // 调用扔瓶子API
      const response = await bottleApi.throwBottle(bottleMessage.trim(), '', token);
      
      if (response && response.status) {
        // 成功扔瓶子，增加使用次数
        const newUsedCount = usedThrowCount + 1;
        await saveUsedThrowCount(newUsedCount);
        
        Alert.alert('成功', '瓶子已扔入大海！', [
          {
            text: '确定',
            onPress: () => {
              setIsModalVisible(false);
              setBottleMessage('');
              setIsThrowing(false);
              // 扔瓶子后立即重新检查可用瓶子
              checkAvailableBottles();
            }
          }
        ]);
        
        console.log('[ThrowCount] 扔瓶子成功，更新使用次数:', newUsedCount);
      } else {
        Alert.alert('失败', response?.message || '扔瓶子失败，请重试');
        setIsThrowing(false);
      }
    } catch (error) {
      console.error('扔瓶子错误:', error);
      Alert.alert('错误', '网络错误，请检查网络连接');
    } finally {
      setIsThrowing(false);
    }
  };

  // 捡瓶子
  const handlePickBottle = async () => {
    try {
      setIsPicking(true);
      
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setIsPicking(false);
        return;
      }

      console.log('[FishCount] 开始捞瓶子，当前已使用次数:', usedFishCount, '总次数:', freeFishCount);

      // 调用捡瓶子API
      const response = await bottleApi.fishBottle(token);
      
      if (response && response.status) {
        if (response.data) {
          // 成功捡到瓶子，增加使用次数
          const newUsedCount = usedFishCount + 1;
          await saveUsedFishCount(newUsedCount);
          
          // 成功捡到瓶子
          const bottleData = response.data;
          setFoundBottle({
            message: bottleData.content,
            sender: bottleData.sender_nickname || `用户${bottleData.sender_uuid?.slice(-4)}`,
            sender_uuid: bottleData.sender_uuid,
            time: new Date(bottleData.created_at).toLocaleString('zh-CN'),
            mood: bottleData.mood,
            bottleUuid: bottleData.uuid
          });
          
          console.log('[FishCount] 捞瓶子成功，更新使用次数:', newUsedCount);
        } else {
          Alert.alert('提示', response.message || '当前海里没有可捞的瓶子');
        }
      } else {
        Alert.alert('失败', response?.message || '捞瓶子失败，请重试');
      }
    } catch (error) {
      console.error('捡瓶子错误:', error);
      Alert.alert('错误', '网络错误，请检查网络连接');
    } finally {
      setIsPicking(false);
    }
  };

  // 关闭找到的瓶子
  const closeFoundBottle = () => {
    setFoundBottle(null);
  };

  // 回复瓶子 - 跳转到消息列表
  const replyToBottle = () => {
    if (!foundBottle) return;
    
    // 关闭瓶子卡片
    setFoundBottle(null);
    
    // 跳转到消息列表，并传递发送者信息
    navigation.navigate('Messages', {
      screen: 'MessagesList',
      params: {
        startChatWith: {
          uuid: foundBottle.sender_uuid,
          nickname: foundBottle.sender
        }
      }
    });
  };

  // 扔回海里
  const throwBackToSea = async () => {
    if (!foundBottle) return;
    
    Alert.alert(
      '确认',
      '确定要将这个瓶子扔回海里吗？',
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '确定',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('错误', '请先登录');
                return;
              }

              const response = await bottleApi.throwBackBottle(foundBottle.bottleUuid, token);
              
              if (response && response.status) {
                setFoundBottle(null);
                Alert.alert('成功', response.message || '瓶子已扔回海里');
              } else {
                Alert.alert('失败', response?.message || '扔回海里失败，请重试');
              }
            } catch (error) {
              console.error('扔回海里错误:', error);
              Alert.alert('错误', '网络错误，请检查网络连接');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />
      
      {/* 背景图片 */}
      <View style={styles.background}>
        <Image 
          source={require('./assets/home_bg.png')} 
          style={styles.backgroundImage}
          resizeMode="cover"
        />
        
        {/* 波浪层 */}
        <View style={styles.waveContainer}>
          <View style={styles.waveLayer}>
            <Svg height={height * 0.4} width={width} style={styles.waveSvg}>
              <Defs>
                <LinearGradient id="waveGradient1" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
                  <Stop offset="100%" stopColor="#1e40af" stopOpacity="0.6" />
                </LinearGradient>
              </Defs>
              <Path
                d={getWavePath1()}
                fill="url(#waveGradient1)"
              />
            </Svg>
          </View>
          
          <View style={styles.waveLayer}>
            <Svg height={height * 0.35} width={width} style={styles.waveSvg}>
              <Defs>
                <LinearGradient id="waveGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#60a5fa" stopOpacity="0.6" />
                  <Stop offset="100%" stopColor="#3b82f6" stopOpacity="0.4" />
                </LinearGradient>
              </Defs>
              <Path
                d={getWavePath2()}
                fill="url(#waveGradient2)"
              />
            </Svg>
          </View>
          
          <View style={styles.waveLayer}>
            <Svg height={height * 0.3} width={width} style={styles.waveSvg}>
              <Defs>
                <LinearGradient id="waveGradient3" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#93c5fd" stopOpacity="0.4" />
                  <Stop offset="100%" stopColor="#60a5fa" stopOpacity="0.2" />
                </LinearGradient>
              </Defs>
              <Path
                d={getWavePath3()}
                fill="url(#waveGradient3)"
              />
            </Svg>
          </View>
        </View>
      </View>

      {/* 主内容 */}
      <View style={styles.content}>
      {/* 标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>漂流瓶</Text>
          <TouchableOpacity style={styles.menuButton}>
            <View style={styles.menuIcon}>
              <View style={styles.menuLine} />
              <View style={styles.menuLine} />
            </View>
          </TouchableOpacity>
        </View>

        {/* 主体内容 - 按钮在右侧 */}
        <View style={styles.mainContent}>
          {/* 右侧操作按钮 */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={[
                styles.actionButton,
                (usedThrowCount >= freeThrowCount) && styles.disabledButton
              ]}
              onPress={() => {
                if (usedThrowCount >= freeThrowCount) {
                  Alert.alert(
                    '扔瓶子次数已用完',
                    `今日免费次数已用完（${usedThrowCount}/${freeThrowCount}）\n\n开通会员可获得更多次数！`,
                    [
                      { text: '明天再来', style: 'cancel' },
                      { 
                        text: '开通会员', 
                        onPress: () => navigation.navigate('MemberCenter')
                      }
                    ]
                  );
                } else {
                  setIsModalVisible(true);
                }
              }}
              disabled={isThrowing}
            >
              <Text style={styles.buttonText}>
                {isThrowing ? '扔中...' : '扔一个'}
              </Text>
              {throwCountLoaded && (
                <Text style={styles.countText}>
                  {usedThrowCount}/{freeThrowCount}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.actionButton,
                (usedFishCount >= freeFishCount) && styles.disabledButton
              ]}
              onPress={() => {
                if (usedFishCount >= freeFishCount) {
                  Alert.alert(
                    '捡瓶子次数已用完',
                    `今日免费次数已用完（${usedFishCount}/${freeFishCount}）\n\n开通会员可获得更多次数！`,
                    [
                      { text: '明天再来', style: 'cancel' },
                      { 
                        text: '开通会员', 
                        onPress: () => navigation.navigate('MemberCenter')
                      }
                    ]
                  );
                } else {
                  handlePickBottle();
                }
              }}
              disabled={isPicking}
            >
              <Text style={styles.buttonText}>
                {isPicking ? '捡中...' : '捡一个'}
              </Text>
              {fishCountLoaded && (
                <Text style={styles.countText}>
                  {usedFishCount}/{freeFishCount}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* 瓶子容器 - 显示所有可用的瓶子 */}
        {availableBottles && availableBottles.length > 0 && availableBottles.map((bottle, index) => {
          // 为每个瓶子计算不同的基础水平位置
          const basePositions = [
            -width * 0.3,  // 左侧
            0,             // 中间
            width * 0.3    // 右侧
          ];
          const baseX = basePositions[index % 3];
          
          // 为每个瓶子创建独立的动画变换，在基础位置上添加漂浮效果
          const individualTransform = {
            transform: [
              {
                translateY: bottleFloat.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-20, 20],
                }),
              },
              {
                // 基础位置 + 漂浮移动
                translateX: bottleMove.interpolate({
                  inputRange: [0, 1],
                  outputRange: [baseX - width * 0.15, baseX + width * 0.15],
                }),
              },
              {
                rotate: bottleRotate.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['-15deg', '15deg'],
                }),
              },
            ],
          };
          
          return (
            <TouchableOpacity 
              key={bottle.uuid || index}
              style={styles.bottleContainer}
              onPress={() => handleBottleClick(bottle)}
              activeOpacity={0.8}
            >
              <Animated.View style={[styles.bottle, individualTransform]}>
                <Image
                  source={require('./assets/bottle.png')}
                  style={styles.bottleImage}
                  resizeMode="contain"
                />
              </Animated.View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 扔瓶子模态框 */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>写下你的心愿</Text>
                <ScrollView 
                  style={styles.modalScrollView}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                >
                  <TextInput
                    style={styles.messageInput}
                    placeholder="在这里写下你想说的话..."
                    value={bottleMessage}
                    onChangeText={setBottleMessage}
                    multiline
                    maxLength={200}
                  />
                </ScrollView>
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      Keyboard.dismiss();
                      setIsModalVisible(false);
                    }}
                  >
                    <Text style={styles.cancelButtonText}>取消</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.modalButton, styles.confirmButton]}
                    onPress={handleThrowBottle}
                    disabled={!bottleMessage.trim()}
                  >
                    <Text style={styles.confirmButtonText}>扔出瓶子</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>

      {/* 找到的瓶子 */}
      {foundBottle && (
        <Modal
          visible={!!foundBottle}
          transparent={true}
          animationType="fade"
          onRequestClose={closeFoundBottle}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.foundBottleCard}>
              <View style={styles.foundBottleHeader}>
                <Text style={styles.foundBottleTitle}>捡到一个瓶子！</Text>
                <TouchableOpacity onPress={closeFoundBottle}>
                  <Text style={styles.closeButton}>×</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.foundBottleContent}>
                <Text style={styles.foundBottleMessage}>{foundBottle.message}</Text>
                {foundBottle.mood && (
                  <Text style={styles.foundBottleMood}>心情：{foundBottle.mood}</Text>
                )}
                <Text style={styles.foundBottleInfo}>
                  {foundBottle.sender} · {foundBottle.time}
                </Text>
              </View>
              <View style={styles.foundBottleActions}>
                <TouchableOpacity
                  style={[styles.foundBottleButton, styles.replyButton]}
                  onPress={replyToBottle}
                >
                  <Text style={styles.replyButtonText}>回复</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.foundBottleButton, styles.throwBackButton]}
                  onPress={throwBackToSea}
                >
                  <Text style={styles.throwBackButtonText}>扔回海里</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e3a8a',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  waveContainer: {
    position: 'absolute',
    top: height * 0.4,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3, // 降低透明度，让背景图片更清晰
  },
  waveLayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  waveSvg: {
    position: 'absolute',
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    width: 24,
    height: 16,
    justifyContent: 'space-between',
  },
  menuLine: {
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 5,
    paddingTop: '15%',
  },
  bottleContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  bottle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleImage: {
    width: 70,
    height: 90,
  },
  actionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginRight: 5,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  countText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: width - 40,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScrollView: {
    maxHeight: 200,
    marginBottom: 20,
  },
  messageInput: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  modalActions: {
    flexDirection: 'row',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
    marginRight: 6,
  },
  confirmButton: {
    backgroundColor: '#3b82f6',
    marginLeft: 6,
  },
  cancelButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  foundBottleCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  foundBottleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  foundBottleTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  foundBottleContent: {
    marginBottom: 20,
  },
  foundBottleMessage: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    marginBottom: 8,
  },
  foundBottleMood: {
    fontSize: 14,
    color: '#3b82f6',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  foundBottleInfo: {
    fontSize: 14,
    color: '#6b7280',
  },
  foundBottleActions: {
    flexDirection: 'row',
    marginTop: 16,
  },
  foundBottleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  replyButton: {
    backgroundColor: '#3b82f6',
    marginRight: 6,
  },
  throwBackButton: {
    backgroundColor: '#6b7280',
    marginLeft: 6,
  },
  replyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  throwBackButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;