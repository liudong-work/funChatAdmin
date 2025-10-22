import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Dimensions,
  ImageBackground,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { membershipApi } from './services/apiService.js';

const { width } = Dimensions.get('window');

export default function MemberCenterScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState({});
  const [selectedPlan, setSelectedPlan] = useState('quarterly'); // 默认选择推荐套餐
  const [membershipPlans, setMembershipPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserInfo();
    loadMembershipPlans();
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

  const loadMembershipPlans = async () => {
    try {
      setLoading(true);
      const response = await membershipApi.getPublicPlans();
      
      if (response && response.status && response.data) {
        // 转换API数据格式以适应前端显示
        const apiPlans = response.data.map(plan => ({
          id: plan.type,
          title: plan.name,
          price: `¥${plan.price}`,
          originalPrice: plan.originalPrice ? `¥${plan.originalPrice}` : null,
          duration: plan.durationText,
          features: Array.isArray(plan.features) ? plan.features : [],
          popular: plan.isPopular,
          type: plan.type,
          rawData: plan
        }));
        
        setMembershipPlans(apiPlans);
        
        // 如果有推荐套餐，设置为默认选择
        const popularPlan = apiPlans.find(plan => plan.popular);
        if (popularPlan) {
          setSelectedPlan(popularPlan.id);
        }
      }
    } catch (error) {
      console.error('加载会员套餐失败:', error);
      // 如果API失败，使用默认数据作为备选
      setMembershipPlans(getDefaultPlans());
    } finally {
      setLoading(false);
    }
  };

  // 默认会员套餐配置（作为API失败时的备选）
  const getDefaultPlans = () => [
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

  // 渲染单个套餐选择按钮（横向排列）
  const renderPlanSelectionCard = (plan) => {
    const isSelected = selectedPlan === plan.id;
    const isPopular = plan.popular;

    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planSelectionCard,
          isSelected && styles.selectedPlanSelection,
          isPopular && styles.popularPlanSelection
        ]}
        onPress={() => handleSelectPlan(plan.id)}
      >
        {isPopular && (
          <View style={styles.popularBadgeSmall}>
            <Text style={styles.popularTextSmall}>推荐</Text>
          </View>
        )}
        
        <Text style={[
          styles.planSelectionTitle,
          isSelected && styles.selectedPlanTitle
        ]}>
          {plan.title}
        </Text>
        
        <View style={styles.planSelectionPrice}>
          <Text style={[
            styles.planSelectionPriceText,
            isSelected && styles.selectedPlanPriceText
          ]}>
            {plan.price}
          </Text>
          <Text style={styles.planSelectionOriginalPrice}>{plan.originalPrice}</Text>
        </View>
        
        <Text style={[
          styles.planSelectionDuration,
          isSelected && styles.selectedPlanDuration
        ]}>
          {plan.duration}
        </Text>
      </TouchableOpacity>
    );
  };

  // 渲染选中套餐的权益详情
  const renderSelectedPlanDetails = () => {
    const selectedPlanData = membershipPlans.find(plan => plan.id === selectedPlan);
    if (!selectedPlanData) return null;

    const isPopular = selectedPlanData.popular;

    return (
      <View style={styles.planDetailsContainer}>
        <View style={styles.planDetailsHeader}>
          <Text style={styles.planDetailsTitle}>{selectedPlanData.title}权益</Text>
          {isPopular && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>推荐</Text>
            </View>
          )}
        </View>

        <View style={styles.planDetailsContent}>
          <View style={styles.planDetailsInfo}>
            <Text style={styles.planDetailsPrice}>{selectedPlanData.price}</Text>
            <Text style={styles.planDetailsOriginalPrice}>{selectedPlanData.originalPrice}</Text>
            <Text style={styles.planDetailsDuration}>{selectedPlanData.duration}</Text>
          </View>

          <View style={styles.planFeaturesList}>
            <Text style={styles.featuresListTitle}>包含权益：</Text>
            {selectedPlanData.features.map((feature, index) => (
              <View key={index} style={styles.featureDetailItem}>
                <Text style={styles.featureDetailIcon}>✨</Text>
                <Text style={styles.featureDetailText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.purchaseButtonLarge,
            isPopular && styles.popularPurchaseButtonLarge
          ]}
          onPress={() => handlePurchase(selectedPlanData)}
        >
          <Text style={[
            styles.purchaseButtonLargeText,
            isPopular && styles.popularPurchaseButtonText
          ]}>
            立即购买 {selectedPlanData.title}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // 如果正在加载，显示loading状态
  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
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
        </View>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#FFD700" />
          <Text style={styles.loadingText}>加载会员套餐中...</Text>
        </View>
      </View>
    );
  }

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
        {/* 会员套餐选择 */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>选择会员套餐</Text>
          <View style={styles.plansSelectionRow}>
            {membershipPlans.map(renderPlanSelectionCard)}
          </View>
        </View>

        {/* 选中套餐的权益详情 */}
        {renderSelectedPlanDetails()}

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
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  plansSection: {
    marginTop: 20,
    marginBottom: 30,
  },
  plansContainer: {
    gap: 15,
  },
  // 新的横向套餐选择样式
  plansSelectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingHorizontal: 10,
  },
  planSelectionCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 5,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedPlanSelection: {
    borderColor: '#FF6B35',
    backgroundColor: '#FFF5F0',
  },
  popularPlanSelection: {
    borderColor: '#FFD700',
  },
  popularBadgeSmall: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  popularTextSmall: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#333',
  },
  planSelectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  selectedPlanTitle: {
    color: '#FF6B35',
  },
  planSelectionPrice: {
    alignItems: 'center',
    marginBottom: 8,
  },
  planSelectionPriceText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedPlanPriceText: {
    color: '#FF6B35',
  },
  planSelectionOriginalPrice: {
    fontSize: 12,
    color: '#999',
    textDecorationLine: 'line-through',
  },
  planSelectionDuration: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  selectedPlanDuration: {
    color: '#FF6B35',
    fontWeight: '500',
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
  // 选中套餐详情样式
  planDetailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  planDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  planDetailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendedBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  recommendedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  planDetailsContent: {
    marginBottom: 25,
  },
  planDetailsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  planDetailsPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginRight: 15,
  },
  planDetailsOriginalPrice: {
    fontSize: 16,
    color: '#999',
    textDecorationLine: 'line-through',
    marginRight: 15,
  },
  planDetailsDuration: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  planFeaturesList: {
    marginTop: 10,
  },
  featuresListTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  featureDetailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingLeft: 10,
  },
  featureDetailIcon: {
    fontSize: 16,
    marginRight: 15,
  },
  featureDetailText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  purchaseButtonLarge: {
    backgroundColor: '#FF6B35',
    borderRadius: 25,
    paddingVertical: 18,
    alignItems: 'center',
  },
  popularPurchaseButtonLarge: {
    backgroundColor: '#FFD700',
  },
  purchaseButtonLargeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  popularPurchaseButtonText: {
    color: '#333',
  },
  // Loading 样式
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
