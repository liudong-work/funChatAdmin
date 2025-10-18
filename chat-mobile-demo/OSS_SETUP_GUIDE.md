# 阿里云OSS集成指南

## 📝 概述

本指南将帮助您在漂流瓶应用中集成阿里云OSS对象存储服务，实现文件的云端存储。

## 🔧 已完成的配置

### ✅ 后端配置

1. **依赖已安装**: `ali-oss` 6.23.0
2. **配置文件已更新**: `backend/src/config/config.js`
3. **环境变量模板已更新**: `backend/env-template.txt`
4. **OSS服务已创建**: `backend/src/services/ossService.js`
5. **上传API已添加**: `/api/upload/oss`

---

## 🚀 快速配置步骤

### 1. 获取OSS访问密钥

1. 登录阿里云控制台
2. 进入 **RAM访问控制** → **用户** → **创建用户**
3. 选择 **编程访问**，创建AccessKey
4. 为用户添加OSS权限策略：
   - `AliyunOSSFullAccess` (完整权限)
   - 或自定义策略（推荐）

### 2. 配置环境变量

复制 `backend/env-template.txt` 为 `.env` 并配置OSS信息：

```bash
cd backend
cp env-template.txt .env
```

编辑 `.env` 文件，配置OSS信息：

```env
# 阿里云OSS配置
OSS_REGION=oss-cn-beijing
OSS_ACCESS_KEY_ID=你的AccessKeyId
OSS_ACCESS_KEY_SECRET=你的AccessKeySecret
OSS_BUCKET=mangguo001
OSS_ENDPOINT=https://oss-cn-beijing.aliyuncs.com
```

### 3. 重启后端服务

```bash
# 停止当前服务
pkill -f "server-with-db.js"

# 重新启动
cd backend
node src/server-with-db.js
```

---

## 📊 API使用说明

### 本地存储API（原有）

```http
POST /api/upload
Content-Type: multipart/form-data
Authorization: Bearer <token>

# 响应
{
  "status": true,
  "message": "上传成功",
  "data": {
    "filename": "img-1234567890-abc123.jpg",
    "url": "http://localhost:8889/uploads/img-1234567890-abc123.jpg",
    "path": "/uploads/img-1234567890-abc123.jpg"
  }
}
```

### OSS存储API（新增）

```http
POST /api/upload/oss
Content-Type: multipart/form-data
Authorization: Bearer <token>

# 响应
{
  "status": true,
  "message": "上传成功",
  "data": {
    "filename": "uploads/1234567890-abc123.jpg",
    "url": "https://mangguo001.oss-cn-beijing.aliyuncs.com/uploads/1234567890-abc123.jpg",
    "size": 12345,
    "type": "oss"
  }
}
```

---

## 🎯 前端集成

### 更新前端API调用

修改前端文件上传逻辑，使用OSS API：

```javascript
// 在 services/apiService.js 中添加
export const uploadToOSS = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('/api/upload/oss', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  
  return response.json();
};
```

### 使用示例

```javascript
// 上传头像
const uploadAvatar = async (imageFile) => {
  const token = await AsyncStorage.getItem('authToken');
  const result = await uploadToOSS(imageFile, token);
  
  if (result.status) {
    // 更新用户头像
    const avatarUrl = result.data.url;
    console.log('头像上传成功:', avatarUrl);
  }
};
```

---

## 🔍 功能特性

### OSS服务功能

1. **文件上传**: 支持本地文件上传到OSS
2. **Buffer上传**: 支持内存数据直接上传
3. **文件删除**: 删除OSS中的文件
4. **预签名URL**: 生成临时访问链接
5. **配置检查**: 自动验证OSS配置完整性

### 安全特性

1. **JWT认证**: 所有上传API需要用户认证
2. **文件类型限制**: 支持文件类型过滤
3. **文件大小限制**: 默认10MB限制
4. **自动清理**: 上传后自动删除本地临时文件

---

## 📋 支持的文件类型

### 图片文件
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- `.bmp`, `.svg`, `.ico`

### 文档文件
- `.pdf`, `.doc`, `.docx`
- `.txt`, `.md`, `.rtf`

### 其他文件
- `.zip`, `.rar`, `.7z`
- `.mp4`, `.avi`, `.mov`
- `.mp3`, `.wav`, `.flac`

---

## 🛠️ 高级配置

### 自定义上传路径

```javascript
// 指定上传路径
const result = await uploadToOSS(filePath, 'custom/folder/image.jpg');
```

### 设置文件权限

```javascript
// 设置文件为公开读
const result = await uploadToOSS(filePath, null, {
  headers: {
    'x-oss-object-acl': 'public-read'
  }
});
```

### 生成预签名URL

```javascript
import { generatePresignedURL } from './services/ossService.js';

// 生成1小时有效的访问链接
const result = await generatePresignedURL('uploads/image.jpg', 3600);
console.log('预签名URL:', result.url);
```

---

## 🐛 故障排除

### 常见问题

1. **配置错误**
   ```
   错误: OSS配置不完整，请检查环境变量
   解决: 检查.env文件中的OSS配置是否正确
   ```

2. **权限不足**
   ```
   错误: AccessDenied
   解决: 检查AccessKey权限，确保有OSS操作权限
   ```

3. **网络问题**
   ```
   错误: Network Error
   解决: 检查网络连接，确认OSS endpoint可访问
   ```

4. **Bucket不存在**
   ```
   错误: NoSuchBucket
   解决: 确认bucket名称正确，或创建对应的bucket
   ```

### 调试方法

1. **检查配置**
   ```javascript
   import { checkOSSConfig } from './services/ossService.js';
   console.log('OSS配置状态:', checkOSSConfig());
   ```

2. **查看日志**
   ```bash
   tail -f backend/logs/drift-bottle.log
   ```

3. **测试连接**
   ```bash
   curl -X GET "https://mangguo001.oss-cn-beijing.aliyuncs.com"
   ```

---

## 📈 性能优化

### 上传优化

1. **分片上传**: 大文件自动分片上传
2. **并发上传**: 支持多文件并发上传
3. **断点续传**: 支持上传失败后重试

### 访问优化

1. **CDN加速**: 配置OSS CDN加速
2. **缓存策略**: 设置合适的缓存头
3. **压缩**: 自动压缩图片文件

---

## 🔒 安全建议

1. **访问控制**: 使用RAM用户，限制权限范围
2. **HTTPS**: 强制使用HTTPS访问
3. **文件扫描**: 集成病毒扫描服务
4. **访问日志**: 开启OSS访问日志记录

---

## 📞 技术支持

如有问题，请查看：

1. **阿里云OSS文档**: https://help.aliyun.com/product/31815.html
2. **ali-oss SDK文档**: https://github.com/ali-sdk/ali-oss
3. **项目日志**: `backend/logs/drift-bottle.log`

---

**配置完成后，您的应用就可以使用阿里云OSS进行文件存储了！** 🎉
