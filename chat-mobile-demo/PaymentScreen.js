import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import wechatPayService from './services/wechatPayService.js';
import { PRODUCTS } from './config/wechat.js';

export default function PaymentScreen({ route, navigation }) {
  const { productType = 'COIN_PACKAGES' } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    loadProducts();
  }, [productType]);

  const loadProducts = () => {
    let productList = [];
    switch (productType) {
      case 'COIN_PACKAGES':
        productList = PRODUCTS.COIN_PACKAGES;
        break;
      case 'MEMBERSHIP':
        productList = PRODUCTS.MEMBERSHIP_PLANS;
        break;
      case 'VIRTUAL_GOODS':
        productList = PRODUCTS.VIRTUAL_GOODS;
        break;
      default:
        productList = PRODUCTS.COIN_PACKAGES;
    }
    setProducts(productList);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleWechatPay = async () => {
    if (!selectedProduct) {
      Alert.alert('提示', '请先选择商品');
      return;
    }

    setLoading(true);
    try {
      // 检查微信支付是否可用
      const isInstalled = await wechatPayService.isWXAppInstalled();
      if (!isInstalled) {
        Alert.alert(
          '微信支付暂不可用', 
          '微信支付功能在 Expo Go 中暂不可用。\n\n请使用 EAS Development Build 来测试支付功能。\n\n或者等待应用正式上架后使用。',
          [
            { text: '确定', onPress: () => setLoading(false) }
          ]
        );
        return;
      }

      // 在Expo Go环境中显示模拟支付提示
      Alert.alert(
        '模拟支付模式',
        '当前在 Expo Go 环境中运行，将使用模拟支付模式进行测试。\n\n实际支付功能需要在正式打包的应用中使用。',
        [
          { text: '取消', onPress: () => setLoading(false) },
          { text: '继续模拟支付', onPress: () => {} }
        ]
      );

      // 获取当前用户ID
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const userInfo = await AsyncStorage.getItem('userInfo');
      const currentUser = userInfo ? JSON.parse(userInfo) : null;
      
      console.log('[支付] 用户信息:', currentUser);
      console.log('[支付] 用户ID:', currentUser?.id);
      
      if (!currentUser || !currentUser.id) {
        Alert.alert('错误', '用户信息获取失败，请重新登录');
        setLoading(false);
        return;
      }

      // 创建订单
      const orderInfo = await wechatPayService.createOrder({
        ...selectedProduct,
        userId: currentUser.id,
        type: productType
      });

      // 发起支付
      const result = await wechatPayService.pay(orderInfo);
      
      if (result.success) {
        Alert.alert('支付成功', '订单已支付完成', [
          { text: '确定', onPress: () => navigation.goBack() }
        ]);
      } else {
        if (result.code === 'USER_CANCEL') {
          Alert.alert('提示', '用户取消支付');
        } else {
          Alert.alert('支付失败', result.message);
        }
      }
    } catch (error) {
      console.error('支付错误:', error);
      Alert.alert(
        '支付功能暂不可用', 
        '微信支付功能在 Expo Go 中暂不可用。\n\n请使用 EAS Development Build 来测试支付功能。',
        [
          { text: '确定', onPress: () => setLoading(false) }
        ]
      );
    } finally {
      setLoading(false);
    }
  };

  const renderProductItem = (product) => {
    const isSelected = selectedProduct?.id === product.id;
    
    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productItem,
          isSelected && styles.selectedProduct
        ]}
        onPress={() => handleProductSelect(product)}
      >
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          {product.description && (
            <Text style={styles.productDescription}>{product.description}</Text>
          )}
          {product.features && (
            <View style={styles.featuresContainer}>
              {product.features.map((feature, index) => (
                <Text key={index} style={styles.feature}>• {feature}</Text>
              ))}
            </View>
          )}
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.price}>¥{product.price}</Text>
          {(Number(product.bonus) || 0) > 0 && (
            <Text style={styles.bonus}>+{product.bonus}赠送</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getTitle = () => {
    switch (productType) {
      case 'COIN_PACKAGES':
        return '积分充值';
      case 'MEMBERSHIP':
        return '会员订阅';
      case 'VIRTUAL_GOODS':
        return '虚拟商品';
      default:
        return '商品购买';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{getTitle()}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.productsContainer}>
          {products.map(renderProductItem)}
        </View>
      </ScrollView>

      <View style={styles.bottomContainer}>
        {selectedProduct && (
          <View style={styles.selectedInfo}>
            <Text style={styles.selectedText}>
              已选择: {selectedProduct.name}
            </Text>
            <Text style={styles.selectedPrice}>
              ¥{selectedProduct.price}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={[
            styles.payButton,
            (!selectedProduct || loading) && styles.payButtonDisabled
          ]}
          onPress={handleWechatPay}
          disabled={!selectedProduct || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>
              💚 微信支付
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  productsContainer: {
    gap: 12,
  },
  productItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedProduct: {
    borderColor: '#07C160',
    backgroundColor: '#f0f9f4',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  featuresContainer: {
    marginTop: 4,
  },
  feature: {
    fontSize: 12,
    color: '#999',
    marginBottom: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07C160',
  },
  bonus: {
    fontSize: 12,
    color: '#ff6b35',
    marginTop: 2,
  },
  bottomContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  selectedInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  selectedText: {
    fontSize: 14,
    color: '#333',
  },
  selectedPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#07C160',
  },
  payButton: {
    backgroundColor: '#07C160',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
