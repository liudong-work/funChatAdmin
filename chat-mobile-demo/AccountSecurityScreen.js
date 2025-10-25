import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountSecurityScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState({});

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

  // 账号与绑定设置
  const handleAccountBinding = () => {
    Alert.alert(
      '账号与绑定设置',
      '修改手机号、绑定邮箱、修改密码等',
      [
        { text: '知道了', style: 'cancel' }
      ]
    );
  };

  // 申请注销 - 跳转到注销页面
  const handleAccountDeletion = () => {
    navigation.navigate('AccountDeletion');
  };

  const securityItems = [
    {
      id: 1,
      title: '账号与绑定设置',
      action: handleAccountBinding,
    },
    {
      id: 2,
      title: '申请注销',
      action: handleAccountDeletion,
      isDanger: true
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>账号安全</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 安全选项列表 */}
        <View style={styles.securityList}>
          {securityItems.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.securityItem,
                index === securityItems.length - 1 && styles.lastItem
              ]}
              onPress={item.action}
              activeOpacity={0.7}
            >
              <View style={styles.itemLeft}>
                <Text style={[
                  styles.itemTitle,
                  item.isDanger && styles.dangerText
                ]}>
                  {item.title}
                </Text>
              </View>
              <Text style={styles.itemArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  header: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#2196F3',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    padding: 5,
  },
  backButtonText: {
    fontSize: 18,
    color: '#1976D2',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
  },
  placeholder: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  securityList: {
    backgroundColor: 'white',
    borderRadius: 12,
    overflow: 'hidden',
  },
  securityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  lastItem: {
    borderBottomWidth: 0,
  },
  itemLeft: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  dangerText: {
    color: '#FF3B30',
  },
  itemArrow: {
    fontSize: 24,
    color: '#C7C7CC',
  },
});

