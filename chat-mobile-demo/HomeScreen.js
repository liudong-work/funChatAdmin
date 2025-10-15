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
import { bottleApi } from './services/apiService';

const { width, height } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [bottleMessage, setBottleMessage] = useState('');
  const [foundBottle, setFoundBottle] = useState(null);
  const [isThrowing, setIsThrowing] = useState(false);
  const [isPicking, setIsPicking] = useState(false);
  
  // 动画值
  const bottleFloat = useRef(new Animated.Value(0)).current;
  const bottleDrift = useRef(new Animated.Value(0)).current;
  const bottleRotate = useRef(new Animated.Value(0)).current;

  // 瓶子漂流动画
  useEffect(() => {
    // 上下浮动动画
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

    // 左右漂流动画
    const driftAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleDrift, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleDrift, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    );

    // 轻微旋转动画
    const rotateAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(bottleRotate, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        }),
        Animated.timing(bottleRotate, {
          toValue: 0,
          duration: 6000,
          useNativeDriver: true,
        }),
      ])
    );

    floatAnimation.start();
    driftAnimation.start();
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
          outputRange: [0, -15],
        }),
      },
      {
        translateX: bottleDrift.interpolate({
          inputRange: [0, 1],
          outputRange: [-10, 10],
        }),
      },
      {
        rotate: bottleRotate.interpolate({
          inputRange: [0, 1],
          outputRange: ['-5deg', '5deg'],
        }),
      },
    ],
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

      // 调用扔瓶子API
      const response = await bottleApi.throwBottle(bottleMessage.trim(), '', token);
      
      if (response && response.status) {
        Alert.alert('成功', '瓶子已扔入大海！', [
          {
            text: '确定',
            onPress: () => {
              setIsModalVisible(false);
              setBottleMessage('');
            }
          }
        ]);
      } else {
        Alert.alert('失败', response?.message || '扔瓶子失败，请重试');
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

      // 调用捡瓶子API
      const response = await bottleApi.fishBottle(token);
      
      if (response && response.status) {
        if (response.data) {
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
      
      {/* 背景渐变 */}
      <View style={styles.background}>
        {/* 天空渐变 */}
        <View style={styles.skyGradient} />
        
        {/* 海洋渐变 */}
        <View style={styles.oceanGradient} />
        
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

        {/* 主体内容 - 瓶子在左侧，按钮在右侧 */}
        <View style={styles.mainContent}>
          {/* 左侧瓶子 */}
          <View style={styles.bottleContainer}>
            <Animated.View style={[styles.bottle, bottleTransform]}>
              <Image
                source={require('./assets/bottle.png')}
                style={styles.bottleImage}
                resizeMode="contain"
              />
            </Animated.View>
          </View>

          {/* 右侧操作按钮 */}
          <View style={styles.actionContainer}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setIsModalVisible(true)}
              disabled={isThrowing}
            >
              <Text style={styles.buttonText}>
                {isThrowing ? '扔瓶子中...' : '扔一个瓶子'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handlePickBottle}
              disabled={isPicking}
            >
              <Text style={styles.buttonText}>
                {isPicking ? '捡瓶子中...' : '捡一个瓶子'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
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
  skyGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: height * 0.6,
    backgroundColor: '#1e40af',
  },
  oceanGradient: {
    position: 'absolute',
    top: height * 0.4,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1e3a8a',
  },
  waveContainer: {
    position: 'absolute',
    top: height * 0.4,
    left: 0,
    right: 0,
    bottom: 0,
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  bottleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottleImage: {
    width: 80,
    height: 120,
  },
  actionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    minWidth: 120,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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