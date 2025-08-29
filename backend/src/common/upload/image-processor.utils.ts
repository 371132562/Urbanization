import { Logger } from '@nestjs/common';

/**
 * 图片处理工具类
 * 提供图片文件名解析、图片数据纠正、图片清理等通用功能
 */
export class ImageProcessorUtils {
  private static readonly logger = new Logger(ImageProcessorUtils.name);

  /**
   * 从富文本 HTML 内容中解析图片文件名
   * 支持以下 src 形式：
   * - /images/uuid.ext, //host/images/uuid.ext, http(s)://host/images/uuid.ext?x=1
   * - 仅文件名 uuid.ext
   * @param content 富文本HTML内容
   * @returns 图片文件名数组
   */
  static parseImageFilenamesFromHtml(content: string): string[] {
    if (!content) return [];

    const result = new Set<string>();
    const imgSrcRegex = /<img[^*>]*\s+src=["']([^"']+)["'][^>]*>/gi;
    let match: RegExpExecArray | null;

    while ((match = imgSrcRegex.exec(content)) !== null) {
      const rawSrc = match[1];
      if (!rawSrc) continue;

      const lastSlashIndex = rawSrc.lastIndexOf('/');
      const filename =
        lastSlashIndex >= 0 ? rawSrc.substring(lastSlashIndex + 1) : rawSrc;

      if (/^[0-9a-zA-Z._-]+\.(?:png|jpe?g|gif|webp|svg)$/.test(filename)) {
        result.add(filename);
      }
    }

    return Array.from(result);
  }

  /**
   * 根据 content 中引用情况与前端提交的 images/deletedImages 进行纠正
   * - 最终 images = 去重(前端 images ∪ content 中的图片)
   * - 最终 deletedImages = 前端 deletedImages 去除所有仍在 content 或最终 images 中的项
   * @param imagesFromDto 前端提交的图片列表
   * @param deletedImagesFromDto 前端提交的已删除图片列表
   * @param content 富文本内容
   * @returns 纠正后的图片数据
   */
  static reconcileImages(
    imagesFromDto: string[],
    deletedImagesFromDto: string[],
    content: string,
  ): { images: string[]; deletedImages: string[] } {
    const contentImages = new Set(this.parseImageFilenamesFromHtml(content));

    // 合并 images（确保不丢）
    const finalImagesSet = new Set<string>(imagesFromDto);
    contentImages.forEach((f) => finalImagesSet.add(f));

    // 过滤 deleted（避免误删）
    const finalDeleted = (deletedImagesFromDto || []).filter(
      (f) => !contentImages.has(f) && !finalImagesSet.has(f),
    );

    // 可选日志：如有修正则打点
    if (finalImagesSet.size !== (imagesFromDto || []).length) {
      this.logger.log(
        `[统计] 纠正图片数据 - images由 ${imagesFromDto.length} 调整为 ${finalImagesSet.size}`,
      );
    }
    if (finalDeleted.length !== (deletedImagesFromDto || []).length) {
      this.logger.log(
        `[统计] 纠正图片数据 - deletedImages由 ${(deletedImagesFromDto || []).length} 调整为 ${finalDeleted.length}`,
      );
    }

    return { images: Array.from(finalImagesSet), deletedImages: finalDeleted };
  }

  /**
   * 从数据库记录中收集图片引用
   * @param records 数据库记录数组
   * @param imagesField 图片字段名
   * @param textField 富文本字段名
   * @returns 图片文件名集合
   */
  static collectImagesFromRecords<T extends Record<string, any>>(
    records: T[],
    imagesField: keyof T,
    textField: keyof T,
  ): Set<string> {
    const inUse = new Set<string>();

    for (const record of records) {
      // 收集 images 字段中的图片文件名
      const images = (record[imagesField] as unknown as string[]) || [];
      images.forEach((f) => inUse.add(f));

      // 收集富文本字段中的图片文件名
      const textContent = (record[textField] as string) || '';
      if (textContent.length > 0) {
        const names = this.parseImageFilenamesFromHtml(textContent);
        names.forEach((f) => inUse.add(f));
      }
    }

    return inUse;
  }

  /**
   * 批量处理多个评价规则的图片数据
   * @param data 评价规则数组
   * @returns 处理后的数据
   */
  static processEvaluationImages<
    T extends {
      images?: string[];
      deletedImages?: string[];
      evaluationText?: string;
      [key: string]: any;
    },
  >(
    data: T[],
  ): {
    processedData: Omit<T, 'deletedImages'>[];
    allDeletedImages: string[];
  } {
    const processedData = data.map((item) => {
      const { deletedImages, ...evaluationData } = item;

      // 保险：根据 content 实际包含的图片，纠正 images / deletedImages
      const reconciled = this.reconcileImages(
        evaluationData.images ?? [],
        deletedImages ?? [],
        evaluationData.evaluationText ?? '',
      );

      return {
        ...evaluationData,
        images: reconciled.images,
      } as Omit<T, 'deletedImages'>;
    });

    // 收集所有已删除的图片，去重
    const allDeletedImages = data
      .flatMap((item) => item.deletedImages ?? [])
      .filter((filename, index, arr) => arr.indexOf(filename) === index);

    return { processedData, allDeletedImages };
  }

  /**
   * 验证图片文件名格式
   * @param filename 文件名
   * @returns 是否为有效的图片文件名
   */
  static isValidImageFilename(filename: string): boolean {
    return /^[0-9a-zA-Z._-]+\.(?:png|jpe?g|gif|webp|svg)$/.test(filename);
  }

  /**
   * 从完整URL中提取文件名
   * @param url 完整URL或路径
   * @returns 文件名
   */
  static extractFilenameFromUrl(url: string): string {
    const lastSlashIndex = url.lastIndexOf('/');
    return lastSlashIndex >= 0 ? url.substring(lastSlashIndex + 1) : url;
  }

  /**
   * 清理图片文件名数组，移除无效的文件名
   * @param filenames 文件名数组
   * @returns 清理后的有效文件名数组
   */
  static cleanImageFilenames(filenames: string[]): string[] {
    return filenames.filter((filename) => this.isValidImageFilename(filename));
  }

  /**
   * 异步清理图片文件，不阻塞主流程
   * @param uploadService 上传服务实例
   * @param logger 日志实例
   * @param deletedImages 要删除的图片文件名数组
   * @param context 上下文信息，用于日志记录
   */
  static cleanupImagesAsync(
    uploadService: { cleanupUnusedImages: (images: string[]) => Promise<void> },
    logger: { error: (message: string) => void },
    deletedImages: string[],
    context: string = '图片清理',
  ): void {
    if (deletedImages.length > 0) {
      uploadService.cleanupUnusedImages(deletedImages).catch((err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : String(err);
        logger.error(`[失败] ${context}任务失败: ${errorMessage}`);
      });
    }
  }

  /**
   * 处理文章创建/更新时的图片数据
   * @param articleData 文章数据
   * @param deletedImages 已删除的图片列表
   * @param content 富文本内容
   * @returns 处理后的文章数据
   */
  static processArticleImages(data: {
    images?: string[];
    deletedImages?: string[];
    content?: string;
    [key: string]: any;
  }): {
    processedData: { [key: string]: any };
    deletedImages: string[];
  } {
    const { deletedImages, ...articleData } = data;

    // 保险：根据 content 实际包含的图片，纠正 images / deletedImages
    const reconciled = this.reconcileImages(
      articleData.images ?? [],
      deletedImages ?? [],
      articleData.content ?? '',
    );

    return {
      processedData: {
        ...articleData,
        images: reconciled.images,
      },
      deletedImages: reconciled.deletedImages,
    };
  }
}
