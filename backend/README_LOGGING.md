# 后端服务日志规范化说明

## 概述

本文档描述了后端服务中各个业务模块和通用模块的日志记录规范。通过统一的日志格式和标准，提高了系统的可维护性、调试能力和运维效率。

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

#### 资源清理
```
[资源清理] 操作描述 - 清理任务信息
```

#### 警告信息
```
[警告] 操作描述 - 警告内容
```

#### 统计信息
```
[统计] 操作描述 - 数量/结果统计
```

#### 跳过操作
```
[跳过] 操作描述 - 跳过原因
```

#### 响应信息
```
[响应] 操作描述 - 响应详情
```

### 3. 关键操作日志点

- **方法入口**: 记录操作开始，包含关键参数
- **数据库操作前后**: 记录查询/更新操作的执行情况
- **业务验证失败**: 记录数据验证失败的具体原因
- **异常捕获**: 记录系统异常和错误信息
- **批量操作统计**: 记录批量操作的结果统计
- **操作完成**: 记录操作成功的结果信息
- **关联删除操作**: 记录级联删除相关数据的操作
- **资源清理操作**: 记录异步资源清理任务的执行
- **安全检查验证**: 记录文件读写、路径白名单、目录存在性等安全检查结果
- **异步任务失败**: 记录异步清理任务等非阻塞操作的失败信息

### 4. 日志内容要求

- **中文描述**: 使用简洁明了的中文描述操作内容
- **参数信息**: 包含关键的业务参数（ID、名称、数量等）
- **结果统计**: 包含操作结果的数量统计
- **错误详情**: 包含错误消息和堆栈信息（ERROR级别）
- **上下文信息**: 包含足够的上下文信息便于问题定位

## 日志示例

### 基础CRUD操作
```typescript
// 开始操作
this.logger.log(`[开始] 创建${实体名称} - 编号: ${dto.code}, 名称: ${dto.name}`);

// 验证失败
this.logger.warn(`[验证失败] 创建${实体名称} - ${实体名称}编号 ${dto.code} 已存在`);

// 操作成功
this.logger.log(`[成功] 创建${实体名称} - 编号: ${dto.code}, 名称: ${dto.name}`);

// 操作失败
this.logger.error(
  `[失败] 创建${实体名称} - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 数据查询操作
```typescript
// 开始查询
this.logger.log(`[开始] 获取${实体名称}列表`);

// 统计信息
this.logger.log(`[成功] 获取${实体名称}列表 - 共 ${items.length} 个${实体名称}`);

// 查询失败
this.logger.error(
  `[失败] 获取${实体名称}列表 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 批量操作
```typescript
// 开始批量操作
this.logger.log(`[开始] 批量更新${实体名称} - 共 ${updates.length} 个${实体名称}`);

// 操作成功
this.logger.log(`[成功] 批量更新${实体名称} - 成功更新 ${totalAffected} 条记录`);

// 警告信息
this.logger.warn(
  `[警告] 批量更新${实体名称} - 请求更新 ${updates.length} 个${实体名称}，但只找到了 ${totalAffected} 个匹配的记录`,
);
```

### 删除操作
```typescript
// 开始删除
this.logger.log(`[开始] 删除${实体名称} - ${实体名称}ID: ${id}`);

// 验证失败
this.logger.warn(
  `[验证失败] 删除${实体名称} - ${实体名称}ID ${id} 不存在或已被删除`,
);

// 关联删除
this.logger.log(
  `[关联删除] 删除关联${关联实体名称} - 主键: ${primaryKey}`,
);

// 操作成功
this.logger.log(
  `[成功] 删除${实体名称} - ${实体名称}ID: ${id}`,
);

// 操作失败
this.logger.error(
  `[失败] 删除${实体名称} - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 文件/资源操作
```typescript
// 开始上传
this.logger.log(`[开始] 上传文件 - 文件名: ${filename}, 大小: ${fileSize} bytes`);

// 文件处理
this.logger.log(`[成功] 处理文件 - 文件名: ${filename}, 处理结果: ${result}`);

// 资源清理
this.logger.log(`[资源清理] 清理过期文件 - 清理数量: ${cleanedCount}`);

// 跳过操作
this.logger.log(`[跳过] 文件仍在使用，跳过删除: ${filename}`);

// 统计信息
this.logger.log(`[统计] 批量操作完成 - 成功: ${successCount}, 失败: ${failCount}`);

// 操作失败
this.logger.error(
  `[失败] 上传文件 - ${error instanceof Error ? error.message : '未知错误'}`,
  error instanceof Error ? error.stack : undefined,
);
```

### 认证授权操作
```typescript
// 开始登录
this.logger.log(`[开始] 用户登录 - 用户名: ${username}`);

// 登录成功
this.logger.log(`[成功] 用户登录 - 用户名: ${username}, 用户ID: ${userId}`);

// 登录失败
this.logger.warn(`[验证失败] 用户登录 - 用户名: ${username}, 原因: 密码错误`);

// 权限验证
this.logger.log(`[开始] 权限验证 - 用户ID: ${userId}, 操作: ${operation}`);

// 权限验证失败
this.logger.warn(`[验证失败] 权限验证 - 用户ID: ${userId}, 操作: ${operation}, 原因: 权限不足`);

// 安全检查验证
this.logger.warn(`[验证失败] 读取文件 - 文件名 ${filename} 不在安全列表中`);
this.logger.warn(`[验证失败] 访问目录 - 目录 ${dirPath} 不存在`);

## 技术实现

### 1. Logger实例创建
```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);
  
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

### 4. 异步任务错误处理
```typescript
// 异步清理任务失败处理
uploadService.cleanupUnusedImages(deletedImages).catch((err: unknown) => {
  const errorMessage = err instanceof Error ? err.message : String(err);
  logger.error(`[失败] ${context}任务失败: ${errorMessage}`);
});
```

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
- **资源清理**: 记录异步资源清理任务，避免孤立资源产生
- **事务一致性**: 确保关联操作的原子性和数据一致性

### 4. 批量操作与统计
- **批量操作**: 记录开始、单项失败警告、最终汇总统计
- **统计信息**: 避免高频循环内逐条打印，优先聚合输出（如"共N条"）
- **跳过操作**: 记录条件不满足时的跳过原因和数量

### 5. 日志维护
- **定期检查**: 定期检查日志质量和完整性
- **性能监控**: 监控日志记录对系统性能的影响
- **存储管理**: 合理配置日志存储策略和清理策略

### 6. 工具类与通用模块日志
- **工具类**: 允许使用Logger进行"[统计]""[失败]"级别的操作性日志
- **日志语义**: 工具类不持有业务上下文，日志语义须清晰明确
- **避免过度**: 工具类内避免过度日志记录，重点关注关键操作和错误

## 模块检查清单

### 业务模块 (businessModules)
- [ ] 用户管理模块
- [ ] 角色管理模块
- [ ] 指标管理模块
- [ ] 国家和地区模块
- [ ] 文章管理模块
- [ ] 评分管理模块
- [ ] 数据管理模块

### 通用模块 (commonModules)
- [x] 认证模块
- [x] 文件上传模块
- [x] 系统日志模块
- [ ] 其他通用模块

### 检查要点
1. **Logger实例**: 是否正确创建Logger实例
2. **日志级别**: 是否正确使用日志级别
3. **日志格式**: 是否符合统一的日志格式规范
4. **错误处理**: 是否正确处理异常并记录日志
5. **敏感信息**: 是否避免记录敏感信息
6. **性能考虑**: 是否避免过度日志记录
7. **缺少日志**: 是否缺少应有的日志
8. **批量操作**: 是否记录批量操作的统计信息
9. **安全检查**: 是否记录文件读写、路径验证等安全检查结果
10. **异步任务**: 是否记录异步清理任务的失败信息

