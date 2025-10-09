# 📱 动态审核管理系统

## 🎯 功能概述

这是一个专门用于审核用户发布动态内容的后台管理系统，支持管理员对用户发布的动态进行审核、通过或拒绝操作。

## ✨ 主要功能

### 📊 数据统计
- **总动态数**: 显示系统中所有动态的总数
- **待审核**: 显示等待审核的动态数量
- **已通过**: 显示审核通过的动态数量
- **已拒绝**: 显示审核拒绝的动态数量

### 🔍 筛选功能
- **状态筛选**: 按审核状态筛选动态（全部/待审核/已通过/已拒绝）
- **日期筛选**: 按发布时间范围筛选动态
- **快速筛选**: 一键查看待审核动态

### 📝 审核功能
- **查看详情**: 查看动态的完整内容和图片
- **审核操作**: 对动态进行通过或拒绝操作
- **审核意见**: 可添加审核意见和备注
- **状态跟踪**: 实时显示审核状态和时间

## 🚀 使用方法

### 1. 启动后端服务器
```bash
cd backend
node src/server-simple.js
```

### 2. 打开管理系统
在浏览器中打开 `chat-admin-system/index.html` 文件

### 3. 开始审核
1. 查看统计数据了解整体情况
2. 使用筛选功能查找需要审核的动态
3. 点击"审核"按钮进行审核操作
4. 选择"通过"或"拒绝"并添加审核意见

## 🔧 API 接口

### 获取统计数据
```
GET /api/admin/moments/statistics
Authorization: Bearer admin_token
```

### 获取待审核动态
```
GET /api/admin/moments/pending?page=1&pageSize=10
Authorization: Bearer admin_token
```

### 获取所有动态
```
GET /api/admin/moments/all?page=1&pageSize=10&status=all&startDate=&endDate=
Authorization: Bearer admin_token
```

### 审核动态
```
POST /api/admin/moments/review/{uuid}
Authorization: Bearer admin_token
Content-Type: application/json

{
  "status": "approved|rejected",
  "reviewComment": "审核意见"
}
```

### 获取动态详情
```
GET /api/admin/moments/detail/{uuid}
Authorization: Bearer admin_token
```

## 🎨 界面特点

- **响应式设计**: 支持桌面和移动设备
- **现代化UI**: 简洁美观的界面设计
- **实时更新**: 审核后自动刷新数据
- **状态标识**: 清晰的状态颜色标识
- **图片预览**: 支持动态图片预览

## 🔐 权限说明

当前使用简化的管理员认证：
- **管理员Token**: `admin_token`
- **实际部署时**: 应使用完整的JWT认证和权限管理系统

## 📱 移动端适配

管理系统完全支持移动端访问：
- 响应式布局适配各种屏幕尺寸
- 触摸友好的按钮和交互
- 优化的移动端操作体验

## 🛠️ 技术栈

- **前端**: 原生HTML + CSS + JavaScript
- **后端**: Node.js + Express
- **存储**: 内存存储（可扩展为数据库）
- **认证**: JWT Token（简化版）

## 📈 扩展功能

未来可以扩展的功能：
- 批量审核操作
- 关键词过滤
- 自动审核规则
- 审核历史记录
- 用户举报处理
- 数据分析报表

## 🔄 工作流程

1. **用户发布动态** → 状态设为"待审核"
2. **管理员查看** → 在管理系统中查看待审核动态
3. **审核决策** → 选择通过或拒绝
4. **状态更新** → 动态状态更新为"已通过"或"已拒绝"
5. **用户可见** → 已通过的动态对用户可见

## 📞 技术支持

如有问题或建议，请联系开发团队。
