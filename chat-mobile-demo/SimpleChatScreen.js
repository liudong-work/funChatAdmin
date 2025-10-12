import React, { useState, useRef, useEffect } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';

export default function SimpleChatScreen() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '你好！欢迎使用即时通讯应用！',
      timestamp: new Date(),
      user: {
        id: 2,
        name: '系统',
        avatar: '👨‍💼',
      },
    },
    {
      id: 2,
      text: '这是一个简单的聊天界面，没有复杂的依赖',
      timestamp: new Date(),
      user: {
        id: 2,
        name: '系统',
        avatar: '👨‍💼',
      },
    },
  ]);
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef(null);

  useEffect(() => {
    // 自动滚动到底部
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  const sendMessage = () => {
    if (inputText.trim()) {
      const newMessage = {
        id: Date.now(),
        text: inputText,
        timestamp: new Date(),
        user: {
          id: 1,
          name: '我',
          avatar: '👤',
        },
      };
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
    }
  };

  const formatTime = (date) => {
    try {
      const dateObj = new Date(date);
      if (isNaN(dateObj.getTime())) {
        console.warn('[SimpleChat] 无效的日期:', date);
        return '--:--';
      }
      return dateObj.toLocaleTimeString('zh-CN', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      console.error('[SimpleChat] 时间格式化错误:', error, '原始日期:', date);
      return '--:--';
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💬 即时通讯 Demo</Text>
      </View>
      
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((message) => (
          <View 
            key={message.id} 
            style={[
              styles.messageWrapper,
              message.user.id === 1 ? styles.myMessage : styles.otherMessage
            ]}
          >
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <Text style={styles.avatar}>{message.user.avatar}</Text>
                <Text style={styles.userName}>{message.user.name}</Text>
                <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
              </View>
              <View style={[
                styles.messageBubble,
                message.user.id === 1 ? styles.myBubble : styles.otherBubble
              ]}>
                <Text style={[
                  styles.messageText,
                  message.user.id === 1 ? styles.myText : styles.otherText
                ]}>
                  {message.text}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="输入消息..."
          multiline
          maxLength={500}
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>发送</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    paddingTop: 50, // 为状态栏留空间
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  messagesContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  messagesContent: {
    paddingVertical: 10,
  },
  messageWrapper: {
    marginVertical: 5,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageContent: {
    maxWidth: '80%',
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  avatar: {
    fontSize: 20,
    marginRight: 8,
  },
  userName: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginLeft: 'auto',
  },
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    maxWidth: '100%',
  },
  myBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 5,
  },
  otherBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomLeftRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  myText: {
    color: 'white',
  },
  otherText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
