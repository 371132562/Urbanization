import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from 'src/upload/upload.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * @description 定时任务：每天凌晨3点执行孤立图片清理
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleCron() {
    this.logger.log('开始执行每日孤立图片清理任务...');
    await this.cleanupOrphanedImages();
  }

  /**
   * @description 清理孤立图片的具体逻辑
   */
  async cleanupOrphanedImages() {
    try {
      // 1. 从 Image 表中获取所有未被软删除的图片记录
      const allImages = await this.prisma.image.findMany({
        where: { delete: 0 },
        select: { filename: true },
      });
      const allImageFilenames = new Set(allImages.map((img) => img.filename));
      this.logger.log(`发现 ${allImageFilenames.size} 张物理图片记录。`);

      // 2. 从 Article 表中获取所有被引用的图片
      const allArticles = await this.prisma.article.findMany({
        where: { delete: 0 },
        select: { images: true },
      });

      const referencedImageFilenames = new Set<string>();
      allArticles.forEach((article) => {
        const images = article.images as string[]; // Prisma 返回的 Json 类型需要断言
        if (Array.isArray(images)) {
          images.forEach((img) => referencedImageFilenames.add(img));
        }
      });
      this.logger.log(
        `发现 ${referencedImageFilenames.size} 张被文章引用的图片。`,
      );

      // 3. 计算差集，找出孤立图片
      const orphanedImages = new Set(
        [...allImageFilenames].filter((x) => !referencedImageFilenames.has(x)),
      );

      this.logger.log(`发现 ${orphanedImages.size} 张孤立图片需要清理。`);

      // 4. 遍历并删除孤立图片
      if (orphanedImages.size > 0) {
        for (const filename of orphanedImages) {
          try {
            this.logger.log(`正在删除孤立图片: ${filename}`);
            await this.uploadService.deleteFile(filename);
          } catch (error) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(
              `删除孤立图片 ${filename} 时发生错误: ${errorMessage}`,
            );
            // 单个文件删除失败不应中断整个任务
          }
        }
      }

      this.logger.log('孤立图片清理任务执行完毕。');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`执行孤立图片清理任务时发生错误: ${errorMessage}`);
    }
  }
}
