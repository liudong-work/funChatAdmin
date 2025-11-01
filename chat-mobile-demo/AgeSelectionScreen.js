import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './services/apiService';
import { useAuthStore } from './stores';

export default function AgeSelectionScreen({ navigation }) {
  // 使用 Zustand 状态管理
  const token = useAuthStore(state => state.token);
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);
  const [selectedAge, setSelectedAge] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ageRanges = [
    { value: '18-24', label: '18-24岁', icon: '🎓' },
    { value: '25-30', label: '25-30岁', icon: '💼' },
    { value: '31-35', label: '31-35岁', icon: '🌟' },
    { value: '36-40', label: '36-40岁', icon: '🎯' },
    { value: '41-50', label: '41-50岁', icon: '👔' },
    { value: '51+', label: '51岁以上', icon: '🎖️' },
  ];

  const handleSubmit = async () => {
    if (!selectedAge) {
      Alert.alert('提示', '请选择您的年龄段\n\n⚠️ 注意：年龄段一旦选定后不可更改');
      return;
    }

    Alert.alert(
      '确认年龄',
      `您选择的年龄段是: ${ageRanges.find(a => a.value === selectedAge)?.label}\n\n⚠️ 确认后将无法更改，是否继续？`,
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '确认',
          onPress: async () => {
            try {
              setIsSubmitting(true);
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('错误', '请先登录');
                return;
              }

              // 调用API更新年龄
              const response = await userApi.updateAge(selectedAge, token);
              
              if (response.status) {
                // 更新本地用户信息
                const userInfoStr = await AsyncStorage.getItem('userInfo');
                if (userInfoStr) {
                  const userInfo = JSON.parse(userInfoStr);
                  userInfo.age_range = selectedAge;
                  await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
                }

                Alert.alert('成功', '年龄设置成功！', [
                  {
                    text: '开始使用',
                    onPress: () => {
                      // 标记已完成初始设置
                      AsyncStorage.setItem('initialSetupComplete', 'true');
                      // 导航到主页面
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Main' }],
                      });
                    }
                  }
                ]);
              } else {
                Alert.alert('错误', response.message || '设置失败，请重试');
              }
            } catch (error) {
              console.error('设置年龄失败:', error);
              Alert.alert('错误', '网络错误，请重试');
            } finally {
              setIsSubmitting(false);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部标题 */}
        <View style={styles.header}>
          <Text style={styles.title}>🎂 选择年龄段</Text>
          <Text style={styles.subtitle}>帮助我们为您提供更好的服务</Text>
          <View style={styles.warningBox}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>年龄段一旦选定后不可更改，请谨慎选择</Text>
          </View>
        </View>

        {/* 年龄选项 */}
        <View style={styles.optionsContainer}>
          {ageRanges.map((ageRange) => (
            <TouchableOpacity
              key={ageRange.value}
              style={[
                styles.ageOption,
                selectedAge === ageRange.value && styles.ageOptionSelected
              ]}
              onPress={() => setSelectedAge(ageRange.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.ageIcon}>{ageRange.icon}</Text>
              <Text style={[
                styles.ageLabel,
                selectedAge === ageRange.value && styles.ageLabelSelected
              ]}>
                {ageRange.label}
              </Text>
              {selectedAge === ageRange.value && (
                <View style={styles.checkMark}>
                  <Text style={styles.checkMarkText}>✓</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedAge || isSubmitting) && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!selectedAge || isSubmitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? '设置中...' : '确认并继续'}
          </Text>
        </TouchableOpacity>

        {/* 底部说明 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 选择年龄段可以帮助我们：
          </Text>
          <Text style={styles.footerItem}>• 推荐更适合您的内容</Text>
          <Text style={styles.footerItem}>• 提供更精准的社交匹配</Text>
          <Text style={styles.footerItem}>• 优化您的使用体验</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#666',
    marginBottom: 20,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0B2',
    marginTop: 8,
  },
  warningIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#F57C00',
    fontWeight: '500',
  },
  optionsContainer: {
    marginBottom: 30,
  },
  ageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 18,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  ageOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
    shadowOpacity: 0.1,
  },
  ageIcon: {
    fontSize: 28,
    marginRight: 16,
  },
  ageLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    color: '#333',
  },
  ageLabelSelected: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  checkMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkMarkText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    backgroundColor: '#C7C7CC',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: 'bold',
  },
  footer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  footerText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    marginBottom: 12,
  },
  footerItem: {
    fontSize: 13,
    color: '#666',
    lineHeight: 24,
    paddingLeft: 8,
  },
});

