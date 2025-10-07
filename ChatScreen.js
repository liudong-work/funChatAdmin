import React, { useState, useCallback, useEffect } from 'react';
import { GiftedChat } from 'react-native-gifted-chat';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // 初始化一些示例消息
    setMessages([
      {
        _id: 1,
        text: '你好！欢迎使用即时通讯应用！',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: '系统',
          avatar: 'https://placeimg.com/140/140/any',
        },
      },
      {
        _id: 2,
        text: '这是一个使用 react-native-gifted-chat 构建的聊天界面',
        createdAt: new Date(),
        user: {
          _id: 2,
          name: '系统',
          avatar: 'https://placeimg.com/140/140/any',
        },
      },
    ]);
  }, []);

  const onSend = useCallback((messages = []) => {
    setMessages(previousMessages =>
      GiftedChat.append(previousMessages, messages)
    );
  }, []);

  return (
    <GiftedChat
      messages={messages}
      onSend={messages => onSend(messages)}
      user={{
        _id: 1,
        name: '我',
        avatar: 'https://placeimg.com/140/140/any',
      }}
      placeholder="输入消息..."
      showUserAvatar={true}
      renderAvatar={(props) => (
        <GiftedChat.Avatar
          {...props}
          imageStyle={{
            left: { width: 40, height: 40, borderRadius: 20 },
            right: { width: 40, height: 40, borderRadius: 20 },
          }}
        />
      )}
      renderBubble={(props) => (
        <GiftedChat.Bubble
          {...props}
          wrapperStyle={{
            left: {
              backgroundColor: '#f0f0f0',
            },
            right: {
              backgroundColor: '#007AFF',
            },
          }}
          textStyle={{
            left: {
              color: '#000',
            },
            right: {
              color: '#fff',
            },
          }}
        />
      )}
      renderTime={(props) => (
        <GiftedChat.Time
          {...props}
          timeTextStyle={{
            left: {
              color: '#999',
            },
            right: {
              color: '#999',
            },
          }}
        />
      )}
    />
  );
}
