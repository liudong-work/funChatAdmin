import OSS from 'ali-oss';
import { config } from '../config/config.js';
import { v4 as uuidv4 } from 'uuid';

// 创建OSS客户端
const createOSSClient = () => {
  if (!config.oss.accessKeyId || !config.oss.accessKeySecret) {
    throw new Error('OSS配置不完整，请检查环境变量');
  }

  return new OSS({
    region: config.oss.region,
    accessKeyId: config.oss.accessKeyId,
    accessKeySecret: config.oss.accessKeySecret,
    bucket: config.oss.bucket,
    endpoint: config.oss.endpoint
  });
};

/**
 * 上传文件到OSS - 参考ali-oss官方实现
 * @param {string} filePath - 本地文件路径
 * @param {string} objectName - OSS中的对象名称（可选，会自动生成）
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果
 */
export const uploadToOSS = async (filePath, objectName = null, options = {}) => {
  try {
    const client = createOSSClient();
    
    // 如果没有指定对象名称，自动生成
    if (!objectName) {
      const timestamp = Date.now();
      const randomId = uuidv4().substring(0, 8);
      const fileExtension = filePath.split('.').pop();
      objectName = `uploads/${timestamp}-${randomId}.${fileExtension}`;
    }

    console.log(`[OSS] 开始上传文件: ${filePath} -> ${objectName}`);
    
    // 使用ali-oss官方推荐的put方法，简化配置
    const result = await client.put(objectName, filePath, {
      // 让OSS自动检测Content-Type
      headers: {
        ...options.headers
      },
      ...options
    });
    
    console.log(`[OSS] 上传成功: ${result.url}`);
    
    return {
      success: true,
      url: result.url,
      name: objectName,
      size: result.res.size,
      etag: result.etag
    };
  } catch (error) {
    console.error('[OSS] 上传失败:', error);
    
    // 根据ali-oss官方错误码提供更详细的错误信息
    let errorMessage = error.message;
    if (error.code === 'InvalidAccessKeyId') {
      errorMessage = 'Access Key ID 无效';
    } else if (error.code === 'SignatureDoesNotMatch') {
      errorMessage = '签名验证失败';
    } else if (error.code === 'NoSuchBucket') {
      errorMessage = 'Bucket 不存在';
    } else if (error.code === 'AccessDenied') {
      errorMessage = '访问被拒绝';
    }
    
    return {
      success: false,
      error: errorMessage,
      code: error.code
    };
  }
};

/**
 * 上传Buffer到OSS
 * @param {Buffer} buffer - 文件Buffer
 * @param {string} objectName - OSS中的对象名称
 * @param {Object} options - 上传选项
 * @returns {Promise<Object>} 上传结果
 */
export const uploadBufferToOSS = async (buffer, objectName, options = {}) => {
  try {
    const client = createOSSClient();
    
    const uploadOptions = {
      headers: {
        'Content-Type': 'application/octet-stream',
        ...options.headers
      },
      ...options
    };

    console.log(`[OSS] 开始上传Buffer: ${objectName}`);
    
    const result = await client.put(objectName, buffer, uploadOptions);
    
    console.log(`[OSS] 上传成功: ${result.url}`);
    
    return {
      success: true,
      url: result.url,
      name: objectName,
      size: result.res.size,
      etag: result.etag
    };
  } catch (error) {
    console.error('[OSS] 上传失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 删除OSS中的文件
 * @param {string} objectName - OSS中的对象名称
 * @returns {Promise<Object>} 删除结果
 */
export const deleteFromOSS = async (objectName) => {
  try {
    const client = createOSSClient();
    
    console.log(`[OSS] 开始删除文件: ${objectName}`);
    
    const result = await client.delete(objectName);
    
    console.log(`[OSS] 删除成功: ${objectName}`);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('[OSS] 删除失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 生成预签名URL（用于前端直传）
 * @param {string} objectName - OSS中的对象名称
 * @param {number} expires - 过期时间（秒）
 * @returns {Promise<Object>} 预签名URL
 */
export const generatePresignedURL = async (objectName, expires = 3600) => {
  try {
    const client = createOSSClient();
    
    const url = client.signatureUrl(objectName, {
      expires: expires
    });
    
    return {
      success: true,
      url,
      expires
    };
  } catch (error) {
    console.error('[OSS] 生成预签名URL失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * 检查OSS配置是否完整
 * @returns {boolean} 配置是否完整
 */
export const checkOSSConfig = () => {
  return !!(config.oss.accessKeyId && config.oss.accessKeySecret && config.oss.bucket);
};

/**
 * 获取OSS客户端（用于高级操作）
 * @returns {OSS} OSS客户端实例
 */
export const getOSSClient = () => {
  return createOSSClient();
};
