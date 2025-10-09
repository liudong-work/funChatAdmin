import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import momentService from './services/momentService';
import { fileApi } from './services/apiService';

const { width: screenWidth } = Dimensions.get('window');

export default function PublishMomentScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPublishing, setIsPublishing] = useState(false);

  // 选择图片
  const selectImages = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册权限才能选择图片');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
        maxWidth: 1024,
        maxHeight: 1024,
      });

      if (!result.canceled && result.assets) {
        const newImages = result.assets.map(asset => ({
          uri: asset.uri,
          width: asset.width,
          height: asset.height,
        }));
        
        if (selectedImages.length + newImages.length > 9) {
          Alert.alert('提示', '最多只能选择9张图片');
          return;
        }
        
        setSelectedImages([...selectedImages, ...newImages]);
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  // 移除图片
  const removeImage = (index) => {
    const newImages = selectedImages.filter((_, i) => i !== index);
    setSelectedImages(newImages);
  };

  // 发布动态
  const publishMoment = async () => {
    if (!content.trim() && selectedImages.length === 0) {
      Alert.alert('提示', '请输入内容或选择图片');
      return;
    }

    setIsPublishing(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userInfo = await AsyncStorage.getItem('userInfo');
      
      if (!token || !userInfo) {
        Alert.alert('提示', '请先登录');
        setIsPublishing(false);
        return;
      }

      const user = JSON.parse(userInfo);
      
      // 上传图片
      let uploadedImages = [];
      if (selectedImages.length > 0) {
        console.log('[PublishMoment] 开始上传图片，共', selectedImages.length, '张');
        
        for (let i = 0; i < selectedImages.length; i++) {
          const image = selectedImages[i];
          console.log(`[PublishMoment] 上传第 ${i + 1} 张图片:`, image.uri);
          
          try {
            // 创建FormData
            const formData = new FormData();
            
            // 获取文件扩展名
            const uriParts = image.uri.split('.');
            const fileType = uriParts[uriParts.length - 1];
            
            formData.append('file', {
              uri: image.uri,
              name: `moment_${Date.now()}_${i}.${fileType}`,
              type: `image/${fileType}`
            });
            
            // 上传图片
            const uploadResponse = await fileApi.uploadFile(formData, token);
            
            if (uploadResponse.status && uploadResponse.data) {
              uploadedImages.push({
                url: uploadResponse.data.url || uploadResponse.data.path,
                width: image.width,
                height: image.height
              });
              console.log(`[PublishMoment] 第 ${i + 1} 张图片上传成功:`, uploadedImages[i]);
            } else {
              throw new Error('图片上传失败');
            }
          } catch (uploadError) {
            console.error(`[PublishMoment] 第 ${i + 1} 张图片上传失败:`, uploadError);
            Alert.alert('错误', `图片上传失败: ${uploadError.message}`);
            setIsPublishing(false);
            return;
          }
        }
      }

      console.log('[PublishMoment] 所有图片上传完成，开始发布动态');
      console.log('[PublishMoment] 发布内容:', {
        content: content.trim(),
        images: uploadedImages,
        userId: user.uuid,
      });

      // 调用API发布动态
      const response = await momentService.publishMoment(
        content.trim(),
        uploadedImages,
        null, // location 暂时为null
        token
      );

      if (response.status) {
        console.log('[PublishMoment] 动态发布成功:', response.data);
        Alert.alert('成功', '动态发布成功！', [
          { text: '确定', onPress: () => {
            setContent('');
            setSelectedImages([]);
            // 导航到动态列表页面
            navigation.navigate('Moments');
          }}
        ]);
      } else {
        throw new Error(response.message || '发布失败');
      }

    } catch (error) {
      console.error('[PublishMoment] 发布动态失败:', error);
      Alert.alert('错误', error.message || '发布失败，请重试');
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 文本输入区域 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            value={content}
            onChangeText={setContent}
            placeholder="分享你的生活..."
            multiline
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{content.length}/500</Text>
        </View>

        {/* 图片预览区域 */}
        {selectedImages.length > 0 && (
          <View style={styles.imagesContainer}>
            <View style={styles.imagesGrid}>
              {selectedImages.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(index)}
                  >
                    <Text style={styles.removeButtonText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 9 && (
                <TouchableOpacity style={styles.addImageButton} onPress={selectImages}>
                  <Text style={styles.addImageButtonText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.actionButton} onPress={selectImages}>
          <Text style={styles.actionButtonIcon}>📷</Text>
          <Text style={styles.actionButtonText}>图片</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonIcon}>📍</Text>
          <Text style={styles.actionButtonText}>位置</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonIcon}>🎭</Text>
          <Text style={styles.actionButtonText}>表情</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.publishButton, isPublishing && styles.publishButtonDisabled]}
          onPress={publishMoment}
          disabled={isPublishing}
        >
          <Text style={styles.publishButtonText}>
            {isPublishing ? '发布中...' : '发布'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  scrollView: {
    flex: 1,
  },
  inputContainer: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 12,
    padding: 15,
    minHeight: 200,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    flex: 1,
    minHeight: 150,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
  },
  imagesContainer: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 15,
    borderRadius: 12,
    padding: 15,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  previewImage: {
    width: (screenWidth - 80) / 3,
    height: (screenWidth - 80) / 3,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ff4757',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: (screenWidth - 80) / 3,
    height: (screenWidth - 80) / 3,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  addImageButtonText: {
    fontSize: 24,
    color: '#999',
  },
  bottomBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 15,
  },
  actionButtonIcon: {
    fontSize: 18,
    marginRight: 5,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#666',
  },
  publishButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginLeft: 'auto',
  },
  publishButtonDisabled: {
    backgroundColor: '#ccc',
  },
  publishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
