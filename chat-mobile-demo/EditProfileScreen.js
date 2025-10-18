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
import { messageApi } from '../services/apiService';

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

      // 上传头像
      const uploadResult = await messageApi.uploadAvatarToOSS(
        uri, 
        asset.fileName || 'avatar.jpg', 
        asset.type || 'image/jpeg',
        token
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (uploadResult && uploadResult.status) {
        // 上传成功，更新头像URL
        setAvatar(uploadResult.data.avatar);
        
        // 更新本地用户信息
        const userInfoStr = await AsyncStorage.getItem('userInfo');
        if (userInfoStr) {
          const userInfo = JSON.parse(userInfoStr);
          userInfo.avatar = uploadResult.data.avatar;
          await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        }
        
        Alert.alert(
          '✅ 头像上传成功', 
          '头像已成功上传到云端存储！\n\n📱 同步说明：\n• 头像已保存到阿里云OSS\n• 可以同步到所有设备\n• 应用重装后头像不会丢失\n• 支持高清图片存储',
          [{ text: '确定' }]
        );
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

      // 更新用户信息
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (userInfoStr) {
        const userInfo = JSON.parse(userInfoStr);
        userInfo.username = username;
        userInfo.bio = bio;
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
      }

      Alert.alert('成功', '个人资料已保存');
      navigation.goBack();
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← 返回</Text>
        </TouchableOpacity>
        <Text style={styles.title}>编辑资料</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#007AFF',
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

export default EditProfileScreenOptimized;
