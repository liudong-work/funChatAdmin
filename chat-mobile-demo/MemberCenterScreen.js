import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function MemberCenterScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState({});
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const user = JSON.parse(userInfoStr);
        setUserInfo(user);
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  // 会员套餐配置
  const membershipPlans = [
    {
      id: 'monthly',
      title: '月度会员',
      price: '¥19',
      originalPrice: '¥25',
      duration: '1个月',
      features: [
        '专属会员标识',
        '每日送5积分',
        '专属客服',
        '无广告体验',
        '高级头像框'
      ],
      popular: false,
    },
    {
      id: 'quarterly',
      title: '季度会员',
      price: '¥49',
      originalPrice: '¥75',
      duration: '3个月',
      features: [
        '专属会员标识',
        '每日送8积分',
        '专属客服',
        '无广告体验',
        '高级头像框',
        '优先匹配',
        '专属背景主题'
      ],
      popular: true, // 推荐套餐
    },
    {
      id: 'yearly',
      title: '年度会员',
      price: '¥168',
      originalPrice: '¥300',
      duration: '12个月',
      features: [
        '专属会员标识',
        '每日送15积分',
        '专属客服',
        '无广告体验',
        '高级头像框',
        '优先匹配',
        '专属背景主题',
        'VIP专属活动',
        '免费礼物特权'
      ],
      popular: false,
    }
  ];

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
  };

  const handlePurchase = async (plan) => {
    try {
      Alert.alert(
        '确认购买',
        `确定购买 ${plan.title} 吗？\n价格：${plan.price}`,
        [
          { text: '取消', style: 'cancel' },
          { 
            text: '确定购买', 
            onPress: () => {
              // 这里调用支付接口
              handlePayment(plan);
            }
          }
        ]
      );
    } catch (error) {
      Alert.alert('错误', '购买失败，请重试');
    }
  };

  const handlePayment = (plan) => {
    // 这里集成微信支付
    Alert.alert('支付', `正在跳转到支付页面...\n套餐：${plan.title}\n价格：${plan.price}`);
    
    // 实际项目中这里应该调用支付服务
    // import wechatPayService from './services/wechatPayService';
    // wechatPayService.createOrder({
    //   productId: plan.id,
    //   amount: plan.price.replace('¥', ''),
    //   description: `${plan.title} - ${plan.duration}`
    // });
  };

  const renderPlanCard = (plan) => {
    const isSelected = selectedPlan === plan.id;
    const isPopular = plan.popular;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlan,
          isPopular && styles.popularPlan
        ]}
        onPress={() => handleSelectPlan(plan.id)}
      >
        {isPopular && (
          <View style={styles.popularBadge}>
            <Text style={styles.popularText}>推荐</Text>
          </View>
        )}
        
        <View style={styles.planHeader}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{plan.price}</Text>
            <Text style={styles.originalPrice}>{plan.originalPrice}</Text>
          </View>
          <Text style={styles.planDuration}>{plan.duration}</Text>
        </View>

        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.purchaseButton,
            isSelected && styles.selectedPurchaseButton,
            isPopular && styles.popularPurchaseButton
          ]}
          onPress={() => handlePurchase(plan)}
        >
          <Text style={[
            styles.purchaseButtonText,
            (isSelected || isPopular) && styles.selectedPurchaseButtonText
          ]}>
            {isSelected ? '立即购买' : '选择套餐'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 顶部背景 */}
      <View style={styles.headerBackground}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>‹ 返回</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>👑 会员中心</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.memberStatus}>
          <Text style={styles.memberStatusText}>
            当前状态：{userInfo.isVIP ? '会员用户' : '普通用户'}
          </Text>
          {userInfo.isVIP && (
            <Text style={styles.memberExpiryText}>
              到期时间：2024-12-31
            </Text>
          )}
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 会员权益说明 */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>会员专享权益</Text>
          <View style={styles.benefitsGrid}>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>👑</Text>
              <Text style={styles.benefitTitle}>专属标识</Text>
              <Text style={styles.benefitDesc}>显示会员身份</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🎁</Text>
              <Text style={styles.benefitTitle}>每日积分</Text>
              <Text style={styles.benefitDesc}>签到获得更多积分</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>💬</Text>
              <Text style={styles.benefitTitle}>专属客服</Text>
              <Text style={styles.benefitDesc}>优先响应服务</Text>
            </View>
            <View style={styles.benefitItem}>
              <Text style={styles.benefitIcon}>🚫</Text>
              <Text style={styles.benefitTitle}>无广告</Text>
              <Text style={styles.benefitDesc}>纯净使用体验</Text>
            </View>
          </View>
        </View>

        {/* 会员套餐选择 */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>选择会员套餐</Text>
          <View style={styles.plansContainer}>
            {membershipPlans.map(renderPlanCard)}
          </View>
        </View>

        {/* 购买说明 */}
        <View style={styles.noteSection}>
          <Text style={styles.noteTitle}>购买说明</Text>
          <Text style={styles.noteText}>
            • 会员服务为自动续费，可在设置中关闭{'\n'}
            • 支持微信支付、支付宝等多种支付方式{'\n'}
            • 购买后立即生效，享受所有会员权益{'\n'}
            • 如有问题请联系客服
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  headerBackground: {
    paddingTop: 50,
    paddingBottom: 30,
    backgroundColor: '#FFD700', // 金色背景
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  memberStatus: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  memberStatusText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
  },
  memberExpiryText: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.8,
    marginTop: 5,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  benefitsSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  benefitItem: {
    width: (width - 60) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  benefitIcon: {
    fontSize: 30,
    marginBottom: 10,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  benefitDesc: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  plansSection: {
    marginBottom: 30,
  },
  plansContainer: {
    gap: 15,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: 'transparent',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  selectedPlan: {
    borderColor: '#FF6B35',
    transform: [{ scale: 1.02 }],
  },
  popularPlan: {
    borderColor: '#FFD700',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
  },
  popularText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 5,
  },
  currentPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B35',
  },
  originalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginLeft: 10,
  },
  planDuration: {
    fontSize: 14,
    color: '#666',
  },
  featuresContainer: {
    marginBottom: 25,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 16,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold',
  },
  featureText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  purchaseButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  selectedPurchaseButton: {
    backgroundColor: '#FF6B35',
  },
  popularPurchaseButton: {
    backgroundColor: '#FFD700',
  },
  purchaseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
  },
  selectedPurchaseButtonText: {
    color: '#333',
  },
  noteSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  noteText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
});
