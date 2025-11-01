import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PrivacySettingsScreen({ navigation }) {
  const [privacySettings, setPrivacySettings] = useState({
    // VIP身份显示
    hideVipStatus: false,
    
    // 隐私保护
    anonymousVisit: false, // 访问他人不留痕
    
    // 消息隐私
    blockStrangerMessages: true, // 禁止陌生人私信
  });

  const [loading, setLoading] = useState(true);

  // 加载隐私设置
  useEffect(() => {
    loadPrivacySettings();
  }, []);

  const loadPrivacySettings = async () => {
    try {
      const stored = await AsyncStorage.getItem('privacySettings');
      if (stored) {
        const settings = JSON.parse(stored);
        setPrivacySettings({ ...privacySettings, ...settings });
      }
    } catch (error) {
      console.error('加载隐私设置失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacySettings = async (newSettings) => {
    try {
      await AsyncStorage.setItem('privacySettings', JSON.stringify(newSettings));
      setPrivacySettings(newSettings);
      console.log('隐私设置已保存');
    } catch (error) {
      console.error('保存隐私设置失败:', error);
      Alert.alert('错误', '保存设置失败，请重试');
    }
  };

  const handleToggle = (key) => {
    const newSettings = {
      ...privacySettings,
      [key]: !privacySettings[key]
    };
    savePrivacySettings(newSettings);
  };

  const resetToDefault = () => {
    Alert.alert(
      '重置设置',
      '确定要将所有隐私设置重置为默认值吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => {
            const defaultSettings = {
              hideVipStatus: false,
              anonymousVisit: false,
              blockStrangerMessages: true,
            };
            savePrivacySettings(defaultSettings);
          }
        }
      ]
    );
  };

  const SettingItem = ({ title, description, value, onToggle, warning = false }) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={[styles.settingTitle, warning && styles.warningText]}>
          {title}
        </Text>
        {description && (
          <Text style={styles.settingDescription}>
            {description}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#E5E5EA', true: '#007AFF' }}
        thumbColor={value ? '#FFFFFF' : '#FFFFFF'}
      />
    </View>
  );

  const SectionHeader = ({ title, description }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {description && (
        <Text style={styles.sectionDescription}>{description}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>加载中...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* 头部 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>隐私设置</Text>
        <TouchableOpacity
          style={styles.resetButton}
          onPress={resetToDefault}
        >
          <Text style={styles.resetButtonText}>重置</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* VIP身份显示 */}
        <SectionHeader
          title="会员身份"
          description="控制您的VIP身份对其他用户的可见性"
        />
        
        <SettingItem
          title="隐藏VIP身份"
          description="开启后，其他用户将看不到您的会员标识"
          value={privacySettings.hideVipStatus}
          onToggle={() => handleToggle('hideVipStatus')}
        />

        {/* 隐私保护 */}
        <SectionHeader
          title="隐私保护"
          description="访问他人主页时的隐私设置"
        />
        
        <SettingItem
          title="匿名访问"
          description="开启后，访问他人主页不会留下足迹记录"
          value={privacySettings.anonymousVisit}
          onToggle={() => handleToggle('anonymousVisit')}
        />

        {/* 消息隐私 */}
        <SectionHeader
          title="消息隐私"
          description="控制谁可以向您发送消息"
        />
        
        <SettingItem
          title="禁止陌生人私信"
          description="开启后，只有好友可以向您发送消息"
          value={privacySettings.blockStrangerMessages}
          onToggle={() => handleToggle('blockStrangerMessages')}
        />

        {/* 底部说明 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            隐私设置会立即生效。我们承诺保护您的隐私，不会滥用您的个人信息。
          </Text>
          <View style={styles.privacyTips}>
            <Text style={styles.tipTitle}>💡 隐私小贴士</Text>
            <Text style={styles.tipText}>• 隐藏VIP身份可以让您更低调地使用应用</Text>
            <Text style={styles.tipText}>• 匿名访问让您可以自由浏览他人主页而不留痕迹</Text>
            <Text style={styles.tipText}>• 禁止陌生人私信可以有效减少骚扰信息</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  resetButton: {
    padding: 8,
  },
  resetButtonText: {
    fontSize: 16,
    color: '#FF3B30',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F9FA',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#666',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 2,
  },
  warningText: {
    color: '#FF3B30',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    marginTop: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  privacyTips: {
    backgroundColor: '#F0F8FF',
    padding: 16,
    borderRadius: 12,
    marginTop: 10,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 22,
    marginBottom: 6,
  },
});
