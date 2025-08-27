# 图片处理工具模块

本模块提供了统一的图片处理工具，用于处理富文本内容中的图片、图片数据纠正、图片清理等功能。

## 文件结构

```
src/common/upload/
├── index.ts                    # 模块导出文件
├── image-processor.utils.ts    # 图片处理工具类
├── multer-config.utils.ts      # Multer配置文件
└── README.md                   # 说明文档
```

## 主要功能

### ImageProcessorUtils 类

#### 1. parseImageFilenamesFromHtml(content: string)
从富文本HTML内容中解析图片文件名
- 支持多种src格式：`/images/uuid.ext`、`//host/images/uuid.ext`、`http(s)://host/images/uuid.ext?x=1`
- 自动提取文件名部分
- 验证文件名格式的有效性

#### 2. reconcileImages(imagesFromDto, deletedImagesFromDto, content)
根据content中引用情况与前端提交的images/deletedImages进行纠正
- 最终 images = 去重(前端 images ∪ content 中的图片)
- 最终 deletedImages = 前端 deletedImages 去除所有仍在 content 或最终 images 中的项
- 防止误删正在使用的图片

#### 3. collectImagesFromRecords(records, imagesField, textField)
从数据库记录中收集图片引用
- 收集images字段中的图片文件名
- 收集富文本字段中的图片文件名
- 返回去重的图片文件名集合

#### 4. processEvaluationImages(data)
批量处理多个评价规则的图片数据
- 自动处理每个评价规则的图片数据
- 返回处理后的数据和已删除的图片列表
- 支持泛型，保持类型安全

#### 5. processArticleImages(data)
处理文章创建/更新时的图片数据
- 自动处理文章的图片数据
- 返回处理后的数据和已删除的图片列表
- 统一文章图片处理逻辑

#### 6. cleanupImagesAsync(uploadService, logger, deletedImages, context)
异步清理图片文件，不阻塞主流程
- 统一的图片清理逻辑
- 支持自定义上下文信息
- 错误处理和日志记录

#### 5. 其他工具方法
- `isValidImageFilename(filename)`: 验证图片文件名格式
- `extractFilenameFromUrl(url)`: 从完整URL中提取文件名
- `cleanImageFilenames(filenames)`: 清理图片文件名数组

## 使用示例

### 在评分评价服务中使用

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 批量处理评价规则的图片数据
const { processedData, allDeletedImages } = ImageProcessorUtils.processEvaluationImages(data);

// 或者单独处理单个评价规则
const reconciled = ImageProcessorUtils.reconcileImages(
  evaluationData.images ?? [],
  deletedImages ?? [],
  evaluationData.evaluationText ?? ''
);
```

### 在文章服务中使用

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 纠正图片数据
const reconciled = ImageProcessorUtils.reconcileImages(
  articleData.images ?? [],
  deletedImages ?? [],
  articleData.content ?? ''
);
```

### 在富文本内容中解析图片

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 解析富文本中的图片文件名
const imageFilenames = ImageProcessorUtils.parseImageFilenamesFromHtml(htmlContent);
```

### 在上传服务中使用

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 在构造函数中直接使用工具类
this.registerInUseImageCollector(async () => {
  const articles = await this.prisma.article.findMany({
    where: { delete: 0 },
    select: { images: true, content: true },
  });
  return ImageProcessorUtils.collectImagesFromRecords(articles, 'images', 'content');
});
```

### 在文章服务中使用

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 处理文章图片数据
const { processedData, deletedImages } = ImageProcessorUtils.processArticleImages({
  ...articleData,
  deletedImages: incomingDeletedImages,
});

// 异步清理图片
ImageProcessorUtils.cleanupImagesAsync(
  this.uploadService,
  this.logger,
  deletedImages,
  '后台图片清理'
);
```

### 在评分评价服务中使用

```typescript
import { ImageProcessorUtils } from '../../common/upload';

// 批量处理评价规则图片数据
const { processedData, allDeletedImages } = ImageProcessorUtils.processEvaluationImages(data);

// 异步清理图片
ImageProcessorUtils.cleanupImagesAsync(
  this.uploadService,
  this.logger,
  allDeletedImages,
  '后台图片清理'
);
```

## 设计原则

1. **统一管理**: 所有图片处理相关的逻辑都集中在这个模块中
2. **类型安全**: 使用TypeScript泛型确保类型安全
3. **可复用**: 提供通用的工具方法，可在多个业务模块中使用
4. **日志记录**: 记录图片数据纠正的过程，便于调试和监控
5. **错误处理**: 提供健壮的错误处理机制
6. **直接调用**: 避免不必要的代理方法，直接使用工具类方法

## 注意事项

1. 图片文件名必须符合特定格式：`[0-9a-zA-Z._-]+\.(png|jpe?g|gif|webp|svg)`
2. 富文本内容中的图片src会被自动解析为文件名
3. 图片数据纠正逻辑确保不会丢失正在使用的图片
4. 异步图片清理不会阻塞主业务流程
