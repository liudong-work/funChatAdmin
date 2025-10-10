-- 创建数据库
CREATE DATABASE IF NOT EXISTS drift_bottle DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE drift_bottle;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(100) UNIQUE NOT NULL COMMENT '用户唯一标识',
  phone VARCHAR(20) UNIQUE NOT NULL COMMENT '手机号',
  username VARCHAR(100) COMMENT '用户名',
  password VARCHAR(255) COMMENT '密码(加密)',
  avatar VARCHAR(255) COMMENT '头像URL',
  status ENUM('active', 'frozen', 'deleted') DEFAULT 'active' COMMENT '状态',
  last_login_at DATETIME COMMENT '最后登录时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_phone (phone),
  INDEX idx_uuid (uuid),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 漂流瓶表
CREATE TABLE IF NOT EXISTS bottles (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(100) UNIQUE NOT NULL COMMENT '瓶子唯一标识',
  content TEXT NOT NULL COMMENT '瓶子内容',
  mood VARCHAR(50) COMMENT '心情标签',
  sender_uuid VARCHAR(100) NOT NULL COMMENT '发送者UUID',
  receiver_uuid VARCHAR(100) COMMENT '接收者UUID',
  status ENUM('sea', 'picked', 'replied', 'deleted') DEFAULT 'sea' COMMENT '状态',
  picked_at DATETIME COMMENT '被捞起时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_uuid (uuid),
  INDEX idx_sender (sender_uuid),
  INDEX idx_receiver (receiver_uuid),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (sender_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (receiver_uuid) REFERENCES users(uuid) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='漂流瓶表';

-- 对话表
CREATE TABLE IF NOT EXISTS conversations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(100) UNIQUE NOT NULL COMMENT '对话唯一标识',
  user1_uuid VARCHAR(100) NOT NULL COMMENT '用户1 UUID',
  user2_uuid VARCHAR(100) NOT NULL COMMENT '用户2 UUID',
  last_message_id BIGINT COMMENT '最后一条消息ID',
  last_message_at DATETIME COMMENT '最后消息时间',
  unread_count_user1 INT DEFAULT 0 COMMENT '用户1未读数',
  unread_count_user2 INT DEFAULT 0 COMMENT '用户2未读数',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_uuid (uuid),
  INDEX idx_user1 (user1_uuid),
  INDEX idx_user2 (user2_uuid),
  INDEX idx_last_message_at (last_message_at),
  UNIQUE KEY uk_users (user1_uuid, user2_uuid),
  FOREIGN KEY (user1_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (user2_uuid) REFERENCES users(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='对话表';

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(100) UNIQUE NOT NULL COMMENT '消息唯一标识',
  conversation_uuid VARCHAR(100) NOT NULL COMMENT '对话UUID',
  sender_uuid VARCHAR(100) NOT NULL COMMENT '发送者UUID',
  receiver_uuid VARCHAR(100) NOT NULL COMMENT '接收者UUID',
  content TEXT COMMENT '消息内容',
  type ENUM('text', 'image', 'audio', 'video', 'file', 'bottle') DEFAULT 'text' COMMENT '消息类型',
  status ENUM('sent', 'delivered', 'read', 'deleted') DEFAULT 'sent' COMMENT '状态',
  bottle_uuid VARCHAR(100) COMMENT '关联瓶子UUID',
  media_url VARCHAR(500) COMMENT '媒体文件URL',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_uuid (uuid),
  INDEX idx_conversation (conversation_uuid),
  INDEX idx_sender (sender_uuid),
  INDEX idx_receiver (receiver_uuid),
  INDEX idx_bottle (bottle_uuid),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (conversation_uuid) REFERENCES conversations(uuid) ON DELETE CASCADE,
  FOREIGN KEY (sender_uuid) REFERENCES users(uuid) ON DELETE CASCADE,
  FOREIGN KEY (receiver_uuid) REFERENCES users(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- 动态表
CREATE TABLE IF NOT EXISTS moments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  uuid VARCHAR(100) UNIQUE NOT NULL COMMENT '动态唯一标识',
  user_id BIGINT NOT NULL COMMENT '用户ID',
  user_uuid VARCHAR(100) NOT NULL COMMENT '用户UUID',
  user_phone VARCHAR(20) COMMENT '用户手机号',
  content TEXT NOT NULL COMMENT '动态内容',
  images JSON COMMENT '图片URLs(JSON数组)',
  privacy ENUM('public', 'friends', 'private') DEFAULT 'public' COMMENT '隐私设置',
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT '审核状态',
  likes_count INT DEFAULT 0 COMMENT '点赞数',
  comments_count INT DEFAULT 0 COMMENT '评论数',
  reviewed_at DATETIME COMMENT '审核时间',
  reviewed_by VARCHAR(100) COMMENT '审核人ID',
  review_comment VARCHAR(500) COMMENT '审核意见',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_uuid (uuid),
  INDEX idx_user_uuid (user_uuid),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_privacy (privacy),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_uuid) REFERENCES users(uuid) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='动态表';

-- 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id VARCHAR(50) PRIMARY KEY COMMENT '管理员ID',
  username VARCHAR(100) UNIQUE NOT NULL COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码(加密)',
  role VARCHAR(50) DEFAULT 'admin' COMMENT '角色',
  status ENUM('active', 'frozen', 'deleted') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  deleted_at DATETIME COMMENT '删除时间',
  INDEX idx_username (username),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='管理员表';

-- 插入默认管理员账号
INSERT INTO admins (id, username, password, role) 
VALUES ('admin_001', 'admin', 'admin123', 'admin')
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

-- 验证码表
CREATE TABLE IF NOT EXISTS verification_codes (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  phone VARCHAR(20) NOT NULL COMMENT '手机号',
  code VARCHAR(10) NOT NULL COMMENT '验证码',
  type ENUM('register', 'login', 'reset_password') DEFAULT 'register' COMMENT '类型',
  attempts INT DEFAULT 0 COMMENT '尝试次数',
  expires_at DATETIME NOT NULL COMMENT '过期时间',
  used_at DATETIME COMMENT '使用时间',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_phone (phone),
  INDEX idx_code (code),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='验证码表';

