import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  Keyboard,
  Modal,
  Image,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { userApi, fileApi } from "./services/apiService";
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PublishMomentScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [images, setImages] = useState([]);
  const [privacy, setPrivacy] = useState('所有人可见');
  const [isPublishing, setIsPublishing] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  // 处理发布
  const handlePublish = async () => {
    if (!content.trim()) {
      Alert.alert('提示', '请输入动态内容');
      return;
    }

    setIsPublishing(true);
    
    try {
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        navigation.goBack();
        return;
      }

      // 先上传图片
      let uploadedImages = [];
      if (images.length > 0) {
        console.log('开始上传图片，共', images.length, '张');
        
        for (let i = 0; i < images.length; i++) {
          try {
            console.log(`上传第${i + 1}张图片:`, images[i]);
            
            // 从URI中提取文件名和类型
            const fileName = `image_${Date.now()}_${i}.jpg`;
            const mimeType = 'image/jpeg';
            
            const uploadResult = await fileApi.uploadFile(images[i], fileName, mimeType, token);
            
            console.log(`[PublishMoment] 第${i + 1}张图片上传结果:`, uploadResult);
            
            // fileApi.uploadFile 返回格式: { ok, status, data }
            // data 是后端返回的 { status, message, data: { url, ... } }
            if (uploadResult.ok && uploadResult.data && uploadResult.data.status) {
              // 使用上传返回的URL（可能是OSS URL或本地URL）
              const imageUrl = uploadResult.data.data.url;
              uploadedImages.push(imageUrl);
              console.log(`第${i + 1}张图片上传成功:`, imageUrl);
            } else {
              const errorMsg = uploadResult.data?.message || uploadResult.message || '图片上传失败';
              throw new Error(errorMsg);
            }
          } catch (error) {
            console.error(`第${i + 1}张图片上传失败:`, error);
            throw new Error(`第${i + 1}张图片上传失败: ${error.message}`);
          }
        }
      }

      // 转换隐私设置
      const privacyMap = {
        '所有人可见': 'public',
        '仅好友可见': 'friends',
        '仅自己可见': 'private'
      };

      console.log('发布动态，图片URLs:', uploadedImages);

      const response = await userApi.publishMoment({
        content: content.trim(),
        images: uploadedImages, // 使用上传后的图片URL
        privacy: privacyMap[privacy] || 'public'
      }, token);
      
      if (response.status) {
        Alert.alert('成功', '动态发布成功，等待审核！', [
          {
            text: '确定',
            onPress: () => navigation.goBack()
          }
        ]);
      } else {
        throw new Error(response.message || '发布失败');
      }
    } catch (error) {
      console.error('发布动态失败:', error);
      Alert.alert('错误', error.message || '发布失败，请重试');
    } finally {
      setIsPublishing(false);
    }
  };


  // 选择图片
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri);
        setImages(prev => [...prev, ...newImages].slice(0, 9)); // 最多9张图片
      }
    } catch (error) {
      Alert.alert('错误', '选择图片失败');
    }
  };

  // 移除图片
  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // 预览图片
  const handlePreviewImage = (uri) => {
    setPreviewImage(uri);
    setShowPreview(true);
  };

  // 关闭预览
  const handleClosePreview = () => {
    setShowPreview(false);
    setPreviewImage(null);
  };

  // 设置隐私
  const handleSetPrivacy = () => {
    Alert.alert(
      '设置隐私',
      '选择谁可以看到这条动态',
      [
        { text: '所有人可见', onPress: () => setPrivacy('所有人可见') },
        { text: '仅好友可见', onPress: () => setPrivacy('仅好友可见') },
        { text: '仅自己可见', onPress: () => setPrivacy('仅自己可见') },
        { text: '取消', style: 'cancel' }
      ]
    );
  };

  const canPublish = content.trim().length > 0 && !isPublishing;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>发布动态</Text>
        
        <TouchableOpacity 
          style={[styles.publishButton, canPublish && styles.publishButtonActive]}
          onPress={handlePublish}
          disabled={!canPublish}
        >
          <Text style={[styles.publishButtonText, canPublish && styles.publishButtonTextActive]}>
            发布
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 内容输入区域 */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="写下这一刻的心事..."
            placeholderTextColor="#999"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          
          {/* 字符计数 */}
          <Text style={styles.charCount}>
            {content.length}/500
          </Text>
        </View>


        {/* 图片预览 */}
        {images.length > 0 && (
          <View style={styles.imagesContainer}>
            <View style={styles.imagesGrid}>
              {images.map((uri, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <TouchableOpacity 
                    style={styles.imageContainer}
                    onPress={() => handlePreviewImage(uri)}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.removeImageButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Text style={styles.removeImageText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 9 && (
                <TouchableOpacity 
                  style={styles.addImageButton}
                  onPress={handlePickImage}
                >
                  <Text style={styles.addImageText}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* 底部工具栏 */}
      <View style={styles.bottomToolbar}>
        <View style={styles.toolbarLeft}>
          <TouchableOpacity style={styles.toolbarButton}>
            <Text style={styles.toolbarIcon}>📄</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.toolbarButton}
            onPress={handlePickImage}
          >
            <Text style={styles.toolbarIcon}>🏞️</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.toolbarButton}>
            <Text style={styles.toolbarIcon}>@</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.privacyButton}
          onPress={handleSetPrivacy}
        >
          <Text style={styles.privacyButtonText}>
            {privacy} >
          </Text>
        </TouchableOpacity>
      </View>

      {/* 图片预览模态框 */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePreview}
      >
        <View style={styles.previewModal}>
          <TouchableOpacity 
            style={styles.previewBackdrop}
            onPress={handleClosePreview}
          >
            <View style={styles.previewContainer}>
              <TouchableOpacity 
                style={styles.previewCloseButton}
                onPress={handleClosePreview}
              >
                <Text style={styles.previewCloseText}>✕</Text>
              </TouchableOpacity>
              {previewImage && (
                <Image 
                  source={{ uri: previewImage }} 
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  closeButton: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  publishButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E5E5EA',
  },
  publishButtonActive: {
    backgroundColor: '#007AFF',
  },
  publishButtonText: {
    fontSize: 16,
    color: '#999',
    fontWeight: 'bold',
  },
  publishButtonTextActive: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 15,
  },
  inputContainer: {
    paddingVertical: 20,
  },
  textInput: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    minHeight: 200,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 10,
  },
  imagesContainer: {
    marginBottom: 20,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  imageWrapper: {
    position: 'relative',
    marginRight: 10,
    marginBottom: 10,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 20,
    height: 20,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addImageButton: {
    width: 80,
    height: 80,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addImageText: {
    fontSize: 24,
    color: '#999',
  },
  bottomToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    backgroundColor: '#FFFFFF',
  },
  toolbarLeft: {
    flexDirection: 'row',
  },
  toolbarButton: {
    marginRight: 20,
    padding: 8,
  },
  toolbarIcon: {
    fontSize: 20,
  },
  privacyButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  privacyButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewContainer: {
    position: 'relative',
    width: '90%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  previewCloseText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
});
