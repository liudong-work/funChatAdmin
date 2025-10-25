import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { userApi } from './services/apiService';

export default function AccountDeletionScreen({ navigation }) {
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 提交注销申请
  const handleSubmitDeletion = () => {
    if (!agree) {
      Alert.alert('提示', '请先阅读并同意注销协议');
      return;
    }

    Alert.alert(
      '确认注销',
      '确定要提交注销申请吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          style: 'destructive',
          onPress: async () => {
            try {
              setSubmitting(true);
              
              const token = await AsyncStorage.getItem('authToken');
              if (!token) {
                Alert.alert('提示', '请先登录');
                setSubmitting(false);
                return;
              }

              console.log('[注销] 开始提交注销申请...');
              
              // 调用注销账号API
              const response = await userApi.deleteAccount('', token);
              
              console.log('[注销] 后端响应:', response);
              
              if (response.status) {
                Alert.alert(
                  '申请已提交',
                  response.data.message || '您的注销申请已提交成功，我们将在7个工作日内处理完成。',
                  [
                    {
                      text: '确定',
                      onPress: async () => {
                        try {
                          // 清除本地数据
                          await AsyncStorage.clear();
                          console.log('[注销] 本地数据已清除');
                          
                          // 返回到我的页面
                          navigation.navigate('Profile');
                        } catch (error) {
                          console.error('[注销] 清除数据失败:', error);
                          navigation.goBack();
                        }
                      }
                    }
                  ]
                );
              } else {
                Alert.alert('失败', response.message || '提交失败，请重试');
              }
            } catch (error) {
              console.error('[注销] 提交失败:', error);
              Alert.alert('错误', '网络错误，请稍后重试');
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

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
        <Text style={styles.headerTitle}>申请注销</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 插图区域 */}
        <View style={styles.illustrationContainer}>
          <View style={styles.phoneIcon}>
            <View style={styles.shieldCircle}>
              <Text style={styles.shieldIcon}>🛡️</Text>
            </View>
          </View>
        </View>

        {/* 用户需知 */}
        <View style={styles.noticeSection}>
          <Text style={styles.noticeTitle}>用户需知</Text>
          
          <View style={styles.noticeList}>
            <View style={styles.noticeItem}>
              <Text style={styles.noticeNumber}>1. </Text>
              <Text style={styles.noticeText}>
                账号注销后，您将无法登录、操作该账号，也无法找回或处理账号中及账号相关的任何内容、信息或资产，即便重新注册也是一个全新的账号；
              </Text>
            </View>

            <View style={styles.noticeItem}>
              <Text style={styles.noticeNumber}>2. </Text>
              <Text style={styles.noticeText}>
                您对账号的注销完全为您自愿、主动放弃包括个人信息、发布内容、金币、贝壳及会员等信息和资产虚拟权益，请您在申请注销前自行备份并妥善处理相关信息和事宜；
              </Text>
            </View>

            <View style={styles.noticeItem}>
              <Text style={styles.noticeNumber}>3. </Text>
              <Text style={styles.noticeText}>
                账号注销期间，如果发现您的账号存在争议纠纷，包括但不限于被投诉、举报或违反法律法规等，我们有权力拒绝您的账号注销申请而无需另行得到您的同意；
              </Text>
            </View>

            <View style={styles.noticeItem}>
              <Text style={styles.noticeNumber}>4. </Text>
              <Text style={styles.noticeText}>
                账号注销完成后，遇见漂流瓶将依法删除您的个人信息或对其进行匿名化处理，法律法规另有规定的除外。
              </Text>
            </View>
          </View>
        </View>

        {/* 同意协议 */}
        <TouchableOpacity 
          style={styles.agreementRow}
          onPress={() => setAgree(!agree)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agree && styles.checkboxChecked]}>
            {agree && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <Text style={styles.agreementText}>
            阅读并同意<Text style={styles.agreementLink}>《遇见漂流瓶账号注销协议》</Text>
          </Text>
        </TouchableOpacity>

        {/* 底部按钮 */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.submitButton, (!agree || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmitDeletion}
            disabled={!agree || submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <Text style={styles.submitButtonText}>申请注销</Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            disabled={submitting}
          >
            <Text style={styles.cancelButtonText}>再考虑一下</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 15,
    paddingHorizontal: 20,
    paddingTop: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  },
  // 插图区域
  illustrationContainer: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 40,
    alignItems: 'center',
    marginBottom: 30,
  },
  phoneIcon: {
    width: 120,
    height: 160,
    backgroundColor: '#BBDEFB',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#90CAF9',
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shieldIcon: {
    fontSize: 48,
  },
  // 用户需知
  noticeSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  noticeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  noticeList: {
    gap: 16,
  },
  noticeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeNumber: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 22,
  },
  // 协议
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#C7C7CC',
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  agreementText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  agreementLink: {
    color: '#2196F3',
  },
  // 按钮
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#F5F5F5',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
});

