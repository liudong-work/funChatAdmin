import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  ScrollView,
} from 'react-native';
import { userApi } from "./services/apiService";

const { width, height } = Dimensions.get('window');

export default function RegisterScreen({ navigation }) {
  const [formData, setFormData] = useState({
    phoneNumber: '',
    verificationCode: '',
    username: '',
    password: '',
    confirmPassword: '',
    gender: '', // 性别字段
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // 倒计时效果
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const isValidPhone = (phone) => {
    const phoneRegex = /^1[3-9]\d{9}$/;
    return phoneRegex.test(phone);
  };

  const sendVerificationCode = async () => {
    if (!formData.phoneNumber) {
      Alert.alert('提示', '请输入手机号');
      return;
    }

    if (!isValidPhone(formData.phoneNumber)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await userApi.sendVerificationCode(formData.phoneNumber);
      
      if (response.status) {
        setIsCodeSent(true);
        setCountdown(60);
        
        // 开发环境显示验证码
        if (response.data && response.data.code) {
          Alert.alert('验证码已发送', `验证码: ${response.data.code}\n(开发环境显示)`);
        } else {
          Alert.alert('成功', '验证码已发送');
        }
      } else {
        Alert.alert('错误', response.message || '发送失败，请重试');
      }
    } catch (error) {
      console.error('发送验证码失败:', error);
      Alert.alert('错误', '发送失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    const { phoneNumber, verificationCode, username, password, confirmPassword, gender } = formData;

    // 表单验证
    if (!phoneNumber || !verificationCode || !username || !password || !confirmPassword) {
      Alert.alert('提示', '请填写完整的注册信息');
      return;
    }

    // 验证性别是否选择
    if (!gender) {
      Alert.alert('提示', '请选择性别\n\n⚠️ 注意：性别一旦选定后不可更改');
      return;
    }

    if (!isValidPhone(phoneNumber)) {
      Alert.alert('提示', '请输入正确的手机号');
      return;
    }

    if (verificationCode.length !== 6) {
      Alert.alert('提示', '请输入6位验证码');
      return;
    }

    if (username.length < 2) {
      Alert.alert('提示', '用户名至少需要2个字符');
      return;
    }

    if (password.length < 6) {
      Alert.alert('提示', '密码至少需要6个字符');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('提示', '两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await userApi.register({
        phone: phoneNumber,
        verificationCode,
        username,
        nickname: username,
        email: '', // 暂时不填写邮箱
        gender: gender, // 性别
      });
      
      if (response.status) {
        // 保存注册返回的token和用户信息
        if (response.data && response.data.token) {
          await AsyncStorage.setItem('authToken', response.data.token);
          await AsyncStorage.setItem('userInfo', JSON.stringify(response.data.user));
        }
        
        // 注册成功后跳转到年龄选择页面
        Alert.alert('注册成功', '请选择您的年龄段', [
          {
            text: '继续',
            onPress: () => navigation.navigate('AgeSelection')
          }
        ]);
      } else {
        Alert.alert('注册失败', response.message || '注册失败，请稍后重试');
      }
    } catch (error) {
      console.error('注册请求失败:', error);
      Alert.alert('错误', '注册失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const goToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 背景装饰 */}
        <View style={styles.backgroundDecoration}>
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* 主要内容 */}
          <View style={styles.content}>
            {/* Logo和标题 */}
            <View style={styles.header}>
              <View style={styles.logoContainer}>
                <Text style={styles.logo}>🌊</Text>
              </View>
              <Text style={styles.title}>加入漂流瓶</Text>
              <Text style={styles.subtitle}>开启你的海洋之旅</Text>
            </View>

            {/* 注册表单 */}
            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>手机号</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.phoneNumber}
                  onChangeText={(value) => handleInputChange('phoneNumber', value)}
                  placeholder="请输入手机号"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={11}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>验证码</Text>
                <View style={styles.codeContainer}>
                  <TextInput
                    style={styles.codeInput}
                    value={formData.verificationCode}
                    onChangeText={(value) => handleInputChange('verificationCode', value)}
                    placeholder="请输入验证码"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[
                      styles.sendCodeButton,
                      (countdown > 0 || isLoading) && styles.sendCodeButtonDisabled
                    ]}
                    onPress={sendVerificationCode}
                    disabled={countdown > 0 || isLoading}
                  >
                    <Text style={styles.sendCodeButtonText}>
                      {countdown > 0 ? `${countdown}s` : '获取验证码'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>用户名</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.username}
                  onChangeText={(value) => handleInputChange('username', value)}
                  placeholder="请输入用户名"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 性别选择 */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>性别 <Text style={styles.warningText}>⚠️ 选定后不可更改</Text></Text>
                <View style={styles.genderContainer}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'male' && styles.genderButtonActive
                    ]}
                    onPress={() => handleInputChange('gender', 'male')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.genderIcon,
                      formData.gender === 'male' && styles.genderIconActive
                    ]}>♂️</Text>
                    <Text style={[
                      styles.genderText,
                      formData.gender === 'male' && styles.genderTextActive
                    ]}>男生</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      formData.gender === 'female' && styles.genderButtonActive
                    ]}
                    onPress={() => handleInputChange('gender', 'female')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.genderIcon,
                      formData.gender === 'female' && styles.genderIconActive
                    ]}>♀️</Text>
                    <Text style={[
                      styles.genderText,
                      formData.gender === 'female' && styles.genderTextActive
                    ]}>女生</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>密码</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.password}
                  onChangeText={(value) => handleInputChange('password', value)}
                  placeholder="请输入密码（至少6位）"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>确认密码</Text>
                <TextInput
                  style={styles.textInput}
                  value={formData.confirmPassword}
                  onChangeText={(value) => handleInputChange('confirmPassword', value)}
                  placeholder="请再次输入密码"
                  placeholderTextColor="#999"
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 注册按钮 */}
              <TouchableOpacity
                style={[styles.registerButton, isLoading && styles.registerButtonDisabled]}
                onPress={handleRegister}
                disabled={isLoading}
              >
                <Text style={styles.registerButtonText}>
                  {isLoading ? '注册中...' : '注册'}
                </Text>
              </TouchableOpacity>

              {/* 用户协议 */}
              <View style={styles.agreement}>
                <View style={styles.agreementRow}>
                  <Text style={styles.agreementText}>注册即表示同意</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('UserAgreement')}>
                    <Text style={styles.agreementLink}>《用户协议》</Text>
                  </TouchableOpacity>
                  <Text style={styles.agreementText}>和</Text>
                  <TouchableOpacity onPress={() => navigation.navigate('PrivacyPolicy')}>
                    <Text style={styles.agreementLink}>《隐私政策》</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* 登录链接 */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>已有账号？</Text>
              <TouchableOpacity onPress={goToLogin}>
                <Text style={styles.loginLink}>立即登录</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#007AFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backgroundDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  circle1: {
    position: 'absolute',
    top: height * 0.05,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle2: {
    position: 'absolute',
    top: height * 0.25,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  circle3: {
    position: 'absolute',
    bottom: height * 0.1,
    right: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 18,
  },
  inputLabel: {
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
    fontWeight: '500',
  },
  warningText: {
    fontSize: 12,
    color: '#FFD700',
    fontWeight: 'normal',
  },
  // 性别选择样式
  genderContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  genderButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'white',
  },
  genderIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  genderIconActive: {
    // 选中时的图标样式
  },
  genderText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  genderTextActive: {
    color: 'white',
    fontWeight: 'bold',
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    marginRight: 12,
  },
  sendCodeButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 100,
    alignItems: 'center',
  },
  sendCodeButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  sendCodeButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  registerButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButtonDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  agreement: {
    alignItems: 'center',
    marginTop: 20,
  },
  agreementRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 18,
    marginHorizontal: 2,
  },
  agreementLink: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
    textDecorationLine: 'underline',
    marginHorizontal: 2,
    paddingVertical: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  loginLink: {
    fontSize: 16,
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});