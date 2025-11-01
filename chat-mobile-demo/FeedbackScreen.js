import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { feedbackApi } from './services/apiService';

export default function FeedbackScreen({ navigation }) {
  const [feedbackType, setFeedbackType] = useState('other');
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const feedbackTypes = [
    { id: 'bug', label: '错误报告', icon: '🐛', color: '#FF3B30' },
    { id: 'feature', label: '功能建议', icon: '💡', color: '#007AFF' },
    { id: 'complaint', label: '投诉举报', icon: '⚠️', color: '#FF9500' },
    { id: 'other', label: '其他反馈', icon: '💬', color: '#34C759' },
  ];

  // 请求相机和相册权限
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert('提示', '需要相机和相册权限才能上传图片');
        }
      }
    })();
  }, []);

  // 选择图片
  const pickImage = async () => {
    if (images.length >= 5) {
      Alert.alert('提示', '最多只能上传5张图片');
      return;
    }

    Alert.alert(
      '选择图片',
      '请选择图片来源',
      [
        {
          text: '拍照',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                await handleImageSelected(result.assets[0]);
              }
            } catch (error) {
              console.error('拍照失败:', error);
              Alert.alert('错误', '拍照失败，请重试');
            }
          }
        },
        {
          text: '从相册选择',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                selectionLimit: 5 - images.length,
                quality: 0.8,
              });

              if (!result.canceled && result.assets && result.assets.length > 0) {
                for (const asset of result.assets) {
                  if (images.length < 5) {
                    await handleImageSelected(asset);
                  }
                }
              }
            } catch (error) {
              console.error('选择图片失败:', error);
              Alert.alert('错误', '选择图片失败，请重试');
            }
          }
        },
        {
          text: '取消',
          style: 'cancel'
        }
      ]
    );
  };

  // 处理选中的图片
  const handleImageSelected = async (asset) => {
    try {
      // 压缩图片
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
      );

      setImages(prev => [...prev, {
        uri: manipulatedImage.uri,
        width: manipulatedImage.width,
        height: manipulatedImage.height
      }]);
    } catch (error) {
      console.error('图片处理失败:', error);
      Alert.alert('错误', '图片处理失败');
    }
  };

  // 删除图片
  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 提交反馈
  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入反馈内容');
      return;
    }

    if (content.trim().length < 10) {
      Alert.alert('提示', '反馈内容至少需要10个字符');
      return;
    }

    setIsSubmitting(true);

    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setIsSubmitting(false);
        return;
      }

      // 准备表单数据
      const formData = new FormData();
      formData.append('type', feedbackType);
      formData.append('content', content.trim());
      if (contact.trim()) {
        formData.append('contact', contact.trim());
      }
      formData.append('app_version', '1.0.0');
      formData.append('device_info', JSON.stringify({
        platform: Platform.OS,
        version: Platform.Version
      }));

      // 添加图片
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const filename = `feedback_${Date.now()}_${i}.jpg`;
        
        formData.append('images', {
          uri: image.uri,
          type: 'image/jpeg',
          name: filename
        });
      }

      const response = await feedbackApi.submit(formData, token);

      if (response && response.status) {
        Alert.alert(
          '提交成功',
          '感谢您的反馈，我们会尽快处理！',
          [
            {
              text: '确定',
              onPress: () => {
                // 清空表单
                setContent('');
                setContact('');
                setImages([]);
                setFeedbackType('other');
                navigation.goBack();
              }
            }
          ]
        );
      } else {
        Alert.alert('提交失败', response?.message || '提交失败，请稍后重试');
      }
    } catch (error) {
      console.error('提交反馈失败:', error);
      Alert.alert('错误', '提交反馈失败，请检查网络后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>用户反馈</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* 反馈类型 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>反馈类型</Text>
          <View style={styles.typeContainer}>
            {feedbackTypes.map((type) => (
              <TouchableOpacity
                key={type.id}
                style={[
                  styles.typeButton,
                  feedbackType === type.id && {
                    ...styles.typeButtonActive,
                    borderColor: type.color,
                    backgroundColor: type.color + '15'
                  }
                ]}
                onPress={() => setFeedbackType(type.id)}
              >
                <Text style={styles.typeIcon}>{type.icon}</Text>
                <Text style={[
                  styles.typeLabel,
                  feedbackType === type.id && { color: type.color, fontWeight: '600' }
                ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* 反馈内容 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            反馈内容 <Text style={styles.required}>*</Text>
          </Text>
          <TextInput
            style={styles.textArea}
            placeholder="请详细描述您的问题或建议（至少10个字符）"
            placeholderTextColor="#999"
            multiline
            numberOfLines={8}
            value={content}
            onChangeText={setContent}
            maxLength={1000}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/1000</Text>
        </View>

        {/* 图片上传 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            上传图片 <Text style={styles.optional}>(可选，最多5张)</Text>
          </Text>
          <View style={styles.imageContainer}>
            {images.map((image, index) => (
              <View key={index} style={styles.imageWrapper}>
                <Image source={{ uri: image.uri }} style={styles.image} />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeImage(index)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {images.length < 5 && (
              <TouchableOpacity style={styles.addImageButton} onPress={pickImage}>
                <Text style={styles.addImageIcon}>📷</Text>
                <Text style={styles.addImageText}>添加图片</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 联系方式 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            联系方式 <Text style={styles.optional}>(可选)</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="方便我们与您联系（手机号/邮箱/微信等）"
            placeholderTextColor="#999"
            value={contact}
            onChangeText={setContact}
            maxLength={100}
          />
        </View>

        {/* 提交按钮 */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>提交反馈</Text>
          )}
        </TouchableOpacity>

        {/* 底部说明 */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 我们重视每一条反馈，会认真对待您的问题和建议
          </Text>
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
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  required: {
    color: '#FF3B30',
  },
  optional: {
    fontSize: 14,
    color: '#999',
    fontWeight: '400',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  typeButtonActive: {
    borderWidth: 2,
  },
  typeIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#666',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
    minHeight: 150,
  },
  charCount: {
    textAlign: 'right',
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  imageContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imageWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 100,
    height: 100,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  addImageIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  addImageText: {
    fontSize: 12,
    color: '#666',
  },
  submitButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 16,
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
});

