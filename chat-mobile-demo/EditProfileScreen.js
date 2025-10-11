import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function EditProfileScreen({ route, navigation }) {
  const { userInfo } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [avatar, setAvatar] = useState(userInfo?.avatar || '👤');
  const [nickname, setNickname] = useState(userInfo?.nickname || '');
  const [bio, setBio] = useState(userInfo?.bio || '');
  const [phone, setPhone] = useState(userInfo?.phone || '');

  // 选择头像
  const handleSelectAvatar = () => {
    Alert.alert(
      '选择头像',
      '请选择头像来源',
      [
        {
          text: '取消',
          style: 'cancel',
        },
        {
          text: '从相册选择',
          onPress: pickImage,
        },
        {
          text: '选择表情',
          onPress: selectEmoji,
        },
      ],
      { cancelable: true }
    );
  };

  // 从相册选择图片
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('提示', '需要相册访问权限');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        // TODO: 上传到服务器
        // 暂时使用本地URI
        setAvatar(uri);
        Alert.alert('提示', '头像设置成功！\n（暂时保存在本地）');
      }
    } catch (error) {
      console.error('选择图片失败:', error);
      Alert.alert('错误', '选择图片失败');
    }
  };

  // 选择表情作为头像
  const selectEmoji = () => {
    const emojis = [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂',
      '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩',
      '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐',
      '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌',
      '👤', '👨', '👩', '👦', '👧', '👶', '👴', '👵',
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
      '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
    ];

    Alert.alert(
      '选择表情头像',
      '',
      [
        { text: '取消', style: 'cancel' },
        ...emojis.slice(0, 10).map(emoji => ({
          text: emoji,
          onPress: () => setAvatar(emoji),
        })),
      ],
      { cancelable: true }
    );
  };

  // 保存个人资料
  const handleSave = async () => {
    // 验证输入
    if (!nickname.trim()) {
      Alert.alert('提示', '请输入昵称');
      return;
    }

    if (nickname.trim().length < 2) {
      Alert.alert('提示', '昵称至少2个字符');
      return;
    }

    if (nickname.trim().length > 20) {
      Alert.alert('提示', '昵称最多20个字符');
      return;
    }

    if (bio.length > 100) {
      Alert.alert('提示', '个人简介最多100个字符');
      return;
    }

    try {
      setLoading(true);

      // 获取当前用户信息
      const userInfoStr = await AsyncStorage.getItem('userInfo');
      if (!userInfoStr) {
        Alert.alert('错误', '请先登录');
        return;
      }

      const currentUserInfo = JSON.parse(userInfoStr);

      // 更新用户信息
      const updatedUserInfo = {
        ...currentUserInfo,
        avatar: avatar,
        nickname: nickname.trim(),
        bio: bio.trim(),
        username: nickname.trim(), // 同步更新username
      };

      // 保存到本地
      await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUserInfo));

      // TODO: 同步到服务器
      // await userApi.updateProfile(updatedUserInfo, token);

      Alert.alert(
        '成功',
        '个人资料已更新！',
        [
          {
            text: '确定',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      console.error('保存失败:', error);
      Alert.alert('错误', '保存失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>‹ 返回</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>编辑资料</Text>
        <TouchableOpacity onPress={handleSave} style={styles.headerSaveButton} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.headerSaveText}>保存</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 头像 */}
        <View style={styles.section}>
          <Text style={styles.label}>头像</Text>
          <TouchableOpacity style={styles.avatarContainer} onPress={handleSelectAvatar}>
            {avatar.startsWith('http') || avatar.startsWith('file') ? (
              <Image source={{ uri: avatar }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatar}>{avatar}</Text>
            )}
            <Text style={styles.changeText}>点击更换</Text>
          </TouchableOpacity>
        </View>

        {/* 昵称 */}
        <View style={styles.section}>
          <Text style={styles.label}>昵称 *</Text>
          <TextInput
            style={styles.input}
            value={nickname}
            onChangeText={setNickname}
            placeholder="请输入昵称（2-20个字符）"
            maxLength={20}
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>{nickname.length}/20</Text>
        </View>

        {/* 个人简介 */}
        <View style={styles.section}>
          <Text style={styles.label}>个人简介</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="介绍一下自己吧~"
            maxLength={100}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>{bio.length}/100</Text>
        </View>

        {/* 手机号（只读） */}
        <View style={styles.section}>
          <Text style={styles.label}>手机号</Text>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={phone}
            editable={false}
            placeholderTextColor="#999"
          />
          <Text style={styles.hint}>手机号不可修改</Text>
        </View>

        {/* 提示信息 */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipTitle}>📋 温馨提示</Text>
          <Text style={styles.tipText}>• 昵称长度为2-20个字符</Text>
          <Text style={styles.tipText}>• 个人简介最多100个字符</Text>
          <Text style={styles.tipText}>• 头像可选择图片或表情</Text>
          <Text style={styles.tipText}>• 修改后的资料会立即生效</Text>
        </View>
      </ScrollView>
    </View>
  );
}

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
  headerSaveButton: {
    padding: 5,
    minWidth: 50,
    alignItems: 'center',
  },
  headerSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: 'white',
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  avatarContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    fontSize: 80,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#f0f0f0',
    textAlign: 'center',
    lineHeight: 100,
    marginBottom: 10,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  },
  changeText: {
    fontSize: 14,
    color: '#007AFF',
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#999',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 5,
    textAlign: 'right',
  },
  tipContainer: {
    backgroundColor: '#FFF9E6',
    margin: 15,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE5B4',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#F59E0B',
    marginBottom: 10,
  },
  tipText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
    marginBottom: 4,
  },
});

