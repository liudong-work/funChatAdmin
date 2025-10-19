import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { messageApi } from './services/apiService';
import apiService from './services/apiService';

const { width } = Dimensions.get('window');

const EditProfileScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        setUsername(userInfo.username || '');
        setBio(userInfo.bio || '');
        setAvatar(userInfo.avatar || '');
      }
    } catch (error) {
      console.error('加载用户信息失败:', error);
    }
  };

  const pickImage = async () => {
    if (loading || uploading) return;
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册访问权限才能选择头像');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
        exif: false, // 不包含EXIF数据，减少文件大小
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const uri = asset.uri;
        
        console.log('[EditProfile] 选择的图片信息:', {
          uri, 
          fileName: asset.fileName, 
          type: asset.type,
          width: asset.width,
          height: asset.height,
          fileSize: asset.fileSize
        });
        
        // 显示图片预览和确认
        const fileSizeText = asset.fileSize ? (asset.fileSize / 1024).toFixed(1) + 'KB' : '未知';
        Alert.alert(
          '📸 确认上传头像',
          `图片尺寸: ${asset.width}x${asset.height}\n文件大小: ${fileSizeText}\n\n是否上传此图片作为头像？`,
          [
            { text: '取消', style: 'cancel' },
            { text: '上传', onPress: () => uploadImage(uri, asset) }
          ]
        );
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败，请重试');
    }
  };

  const uploadImage = async (uri, asset) => {
    setUploading(true);
    setUploadProgress(0);
    
    try {
      // 获取用户token
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setUploading(false);
        return;
      }

      // 显示上传进度
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      // 上传头像 - 确保mimeType有值
      const fileName = asset.fileName || 'avatar.jpg';
      
      // 修复mimeType推断逻辑
      let mimeType = asset.type;
      if (!mimeType || mimeType === 'image' || !mimeType.includes('/')) {
        const ext = fileName.toLowerCase().split('.').pop();
        const extToMime = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp'
        };
        mimeType = extToMime[ext] || 'image/jpeg';
      }
      
      console.log('[EditProfile] 上传参数:', {
        uri: uri.substring(0, 50) + '...',
        fileName,
        originalType: asset.type,
        finalMimeType: mimeType,
        hasToken: !!token
      });
      
      const uploadResult = await messageApi.uploadAvatarToOSS(
        uri, 
        fileName, 
        mimeType,
        token
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult && uploadResult.status) {
        // 上传成功，更新头像URL
        const avatarUrl = uploadResult.data.url;
        console.log('[EditProfile] 更新头像URL:', avatarUrl);
        setAvatar(avatarUrl);
        
        // 立即保存头像URL到数据库
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          
          try {
            // 调用后端API保存头像到数据库
            const updateResponse = await apiService.authenticatedPut(
              '/api/user/profile', 
              { avatar: avatarUrl }, 
              token
            );
            
            if (updateResponse && updateResponse.status) {
              // 更新本地用户信息
              userInfo.avatar = avatarUrl;
              await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
              console.log('[EditProfile] 头像已保存到数据库和本地缓存');
              
              Alert.alert(
                '✅ 头像上传成功', 
                '头像已成功上传并保存！\n\n📱 同步说明：\n• 头像已保存到阿里云OSS\n• 已同步到数据库\n• 可以同步到所有设备\n• 应用重装后头像不会丢失\n• 支持高清图片存储',
                [{ text: '确定' }]
              );
            } else {
              throw new Error(updateResponse?.message || '保存到数据库失败');
            }
          } catch (saveError) {
            console.error('[EditProfile] 保存头像到数据库失败:', saveError);
            // 即使保存到数据库失败，也更新本地缓存
            userInfo.avatar = avatarUrl;
            await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
            
            Alert.alert(
              '⚠️ 部分成功', 
              '头像已上传到OSS，但保存到数据库失败。\n请稍后点击"保存"按钮同步到数据库。',
              [{ text: '确定' }]
            );
          }
        }
      } else {
        throw new Error(uploadResult?.message || '上传失败');
      }
    } catch (uploadError) {
      console.error('[EditProfile] 头像上传失败:', uploadError);
      
      // 提供更友好的错误信息
      let errorMessage = uploadError.message || '头像上传失败，请重试';
      if (errorMessage.includes('不支持的文件格式')) {
        errorMessage = '请选择 JPG、PNG、GIF 或 WebP 格式的图片';
      } else if (errorMessage.includes('图片文件过大')) {
        errorMessage = '图片文件过大，请选择小于10MB的图片';
      } else if (errorMessage.includes('网络连接失败')) {
        errorMessage = '网络连接失败，请检查网络设置后重试';
      }
      
      Alert.alert(
        '❌ 上传失败', 
        errorMessage,
        [
          { text: '重试', onPress: () => uploadImage(uri, asset) },
          { text: '取消' }
        ]
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const saveProfile = async () => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (!token) {
        Alert.alert('错误', '请先登录');
        setLoading(false);
        return;
      }

      // 获取当前用户信息
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (!userInfoStr) {
        Alert.alert('错误', '用户信息不存在');
        setLoading(false);
        return;
      }

      const userInfo = JSON.parse(userInfoStr);
      
      // 调用后端API更新用户信息（包括头像）
      const updateData = {
        nickname: username,
        bio: bio,
        avatar: avatar // 保存头像URL到数据库
      };

      console.log('[EditProfile] 更新用户信息到数据库:', updateData);
      
      // 使用正确的API端点
      const response = await apiService.authenticatedPut('/api/user/profile', updateData, token);
      
      if (response && response.status) {
        // 更新本地用户信息
        userInfo.username = username;
        userInfo.nickname = username;
        userInfo.bio = bio;
        userInfo.avatar = avatar;
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        
        console.log('[EditProfile] 用户信息已保存到数据库');
        Alert.alert('成功', '个人资料已保存');
        navigation.goBack();
      } else {
        throw new Error(response?.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', error.message || '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <TouchableOpacity onPress={saveProfile} style={styles.saveButton} disabled={loading}>
          <Text style={[styles.saveButtonText, loading && styles.disabledText]}>
            {loading ? '保存中...' : '保存'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* 头像部分 */}
        <View style={styles.avatarSection}>
          <Text style={styles.sectionTitle}>头像</Text>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={styles.avatarWrapper} 
              onPress={pickImage}
              disabled={uploading}
            >
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>📷</Text>
                  <Text style={styles.avatarPlaceholderLabel}>点击选择头像</Text>
                </View>
              )}
              
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator size="large" color="#007AFF" />
                  <Text style={styles.uploadText}>上传中...</Text>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
                  </View>
                </View>
              )}
            </TouchableOpacity>
          </View>
          
          <Text style={styles.avatarHint}>
            {uploading ? '正在上传头像...' : '点击头像选择新图片'}
          </Text>
        </View>

        {/* 用户名部分 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>用户名</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="请输入用户名"
            maxLength={20}
          />
        </View>

        {/* 个人简介部分 */}
        <View style={styles.inputSection}>
          <Text style={styles.sectionTitle}>个人简介</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="介绍一下自己吧..."
            multiline
            maxLength={100}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{bio.length}/100</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    paddingTop: 50,
    backgroundColor: '#007AFF',
  },
  headerBackButton: {
    padding: 5,
  },
  headerBackText: {
    color: 'white',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  content: {
    padding: 16,
  },
  avatarSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ccc',
    borderStyle: 'dashed',
  },
  avatarPlaceholderText: {
    fontSize: 32,
    marginBottom: 4,
  },
  avatarPlaceholderLabel: {
    fontSize: 12,
    color: '#666',
  },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontSize: 14,
    marginTop: 8,
  },
  progressBar: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  avatarHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  bioInput: {
    height: 80,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
});

export default EditProfileScreen;
