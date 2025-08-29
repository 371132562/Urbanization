# 后端服务日志规范化说明

## 概述

本文档描述了后端服务中各个业务模块和通用模块的日志记录规范。通过统一的日志格式和标准，提高了系统的可维护性、调试能力和运维效率。

## 日志规范化完成状态

### ✅ 已完成的模块

1. **用户管理模块** (`businessModules/user/`)
   - `user.service.ts` - 用户CRUD操作日志规范化
   - 包含：用户列表、创建、编辑、删除、密码重置等操作

2. **角色管理模块** (`businessModules/role/`)
   - `role.service.ts` - 角色管理操作日志规范化
   - 包含：角色列表、创建、编辑、删除、权限分配等操作

3. **指标管理模块** (`businessModules/indicator/`)
   - `indicator.service.ts` - 指标层级和权重管理日志规范化
   - 包含：指标层级获取、权重批量更新等操作

4. **认证模块** (`commonModules/auth/`)
   - `auth.service.ts` - 用户认证操作日志规范化
   - 包含：用户登录、Token验证、用户信息获取等操作

5. **国家和地区模块** (`businessModules/countryAndContinent/`)
   - `countryAndContinent.service.ts` - 地理数据管理日志规范化
   - 包含：大洲信息、国家信息、城镇化数据、批量更新等操作

6. **文章管理模块** (`businessModules/article/`)
   - `article.service.ts` - 文章管理操作日志规范化
   - 包含：文章CRUD、图片处理、异步清理等操作

7. **文件上传模块** (`commonModules/upload/`)
   - `upload.service.ts` - 文件上传管理日志规范化
   - 包含：文件上传、删除、重复检测、图片清理等操作

8. **评分管理模块** (`businessModules/score/`)
   - `score.service.ts` - 评分数据管理日志规范化
   - 包含：年份列表、按国家分组、评分数据查询、评分记录物理删除、评价详情CRUD等操作

9. **数据管理模块** (`businessModules/dataManagement/`)
   - `dataManagement.service.ts` - 数据管理操作日志规范化
   - 包含：年份数据查询、分页、排序、搜索等操作

## 日志规范标准

### 1. 日志级别使用规范

- **INFO**: 正常业务流程、数据查询、创建、更新、删除等操作
- **WARN**: 业务警告、数据验证失败、非关键错误
- **ERROR**: 系统错误、异常、数据库操作失败
- **DEBUG**: 调试信息、详细执行步骤（生产环境通常关闭）

### 2. 日志格式规范

#### 操作开始
```
[开始] 操作描述 - 参数信息
```

#### 操作成功
```
[成功] 操作描述 - 结果信息
```

#### 操作失败
```
[失败] 操作描述 - 错误原因
```

#### 验证失败
```
[验证失败] 操作描述 - 失败原因
```

#### 关联删除
```
[关联删除] 操作描述 - 关联数据信息
```

#### 图片清理
```
[图片清理] 操作描述 - 清理任务信息
```

#### 警告信息
```
[警告] 操作描述 - 警告内容
```

#### 统计信息
```
[统计] 操作描述 - 数量/结果统计
```

### 3. 关键操作日志点

- **方法入口**: 记录操作开始，包含关键参数
- **数据库操作前后**: 记录查询/更新操作的执行情况
- **业务验证失败**: 记录数据验证失败的具体原因
- **异常捕获**: 记录系统异常和错误信息
- **批量操作统计**: 记录批量操作的结果统计
- **操作完成**: 记录操作成功的结果信息
- **关联删除操作**: 记录级联删除相关数据的操作
- **图片清理操作**: 记录异步图片清理任务的执行

### 4. 日志内容要求

- **中文描述**: 使用简洁明了的中文描述操作内容
- **参数信息**: 包含关键的业务参数（ID、名称、数量等）
- **结果统计**: 包含操作结果的数量统计
- **错误详情**: 包含错误消息和堆栈信息（ERROR级别）
- **上下文信息**: 包含足够的上下文信息便于问题定位

## 日志示例

### 用户管理操作
```typescript
// 开始操作
this.logger.log(`[开始] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);

// 验证失败
this.logger.warn(`[验证失败] 创建用户 - 用户编号 ${dto.code} 已存在`);

// 操作成功
this.logger.log(`[成功] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);

// 操作失败
this.logger.error(
  `[失败] 创建用户 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 数据查询操作
```typescript
// 开始查询
this.logger.log(`[开始] 获取用户列表`);

// 统计信息
this.logger.log(`[成功] 获取用户列表 - 共 ${users.length} 个用户`);

// 查询失败
this.logger.error(
  `[失败] 获取用户列表 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 批量操作
```typescript
// 开始批量操作
this.logger.log(`[开始] 批量更新国家城镇化状态 - 共 ${updates.length} 个国家`);

// 操作成功
this.logger.log(`[成功] 批量更新国家城镇化状态 - 成功更新 ${totalAffected} 条记录`);

// 警告信息
this.logger.warn(
  `[警告] 批量更新国家城镇化状态 - 请求更新 ${updates.length} 个国家，但只找到了 ${totalAffected} 个匹配的记录`,
);
```

### 评分记录物理删除操作
```typescript
// 开始删除
this.logger.log(`[开始] 删除评分记录 - 评分ID: ${id}`);

// 验证失败
this.logger.warn(
  `[验证失败] 删除评分记录 - 评分ID ${id} 不存在或已被删除`,
);

// 关联删除
this.logger.log(
  `[关联删除] 删除评分详情 - 年份: ${year}, 国家ID: ${countryId}`,
);

// 操作成功
this.logger.log(
  `[成功] 删除评分记录 - 评分ID: ${id}, 年份: ${year}, 国家ID: ${countryId}`,
);

// 操作失败
this.logger.error(
  `[失败] 删除评分记录 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 评价详情删除操作
```typescript
// 开始删除
this.logger.log(
  `[开始] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
);

// 验证失败
this.logger.warn(
  `[验证失败] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId} 不存在或已被删除`,
);

// 操作成功
this.logger.log(
  `[成功] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
);

// 操作失败
this.logger.error(
  `[失败] 删除评价详情 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

## 技术实现

### 1. Logger实例创建
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  
  // ... 其他代码
}
```

### 2. 错误处理模式
```typescript
try {
  // 业务逻辑
  this.logger.log(`[成功] 操作描述`);
  return result;
} catch (error) {
  if (error instanceof BusinessException) {
    throw error; // 业务异常直接抛出
  }
  // 系统异常记录日志
  this.logger.error(
    `[失败] 操作描述 - ${error instanceof Error ? error.message : '未知错误'}`,
    error instanceof Error ? error.stack : undefined,
  );
  throw error;
}
```

### 3. 类型安全
- 使用 `error instanceof Error` 检查错误类型
- 安全访问错误消息和堆栈信息
- 避免 `any` 类型的使用

## 最佳实践

### 1. 日志记录原则
- **适度记录**: 只记录关键操作和错误信息，避免过度日志
- **信息完整**: 包含足够的上下文信息便于问题定位
- **性能考虑**: 避免在循环中记录大量日志
- **敏感信息**: 不记录密码、Token等敏感信息

### 2. 错误处理
- **业务异常**: 使用 `BusinessException` 处理业务逻辑错误
- **系统异常**: 记录详细错误信息并重新抛出
- **异常分类**: 区分不同类型的异常并采用相应的处理策略

### 3. 关联操作处理
- **级联删除**: 记录关联数据的删除操作，便于追踪数据完整性
- **图片清理**: 记录异步图片清理任务，避免孤立文件产生
- **事务一致性**: 确保关联操作的原子性和数据一致性

### 4. 日志维护
- **定期检查**: 定期检查日志质量和完整性
- **性能监控**: 监控日志记录对系统性能的影响
- **存储管理**: 合理配置日志存储策略和清理策略

