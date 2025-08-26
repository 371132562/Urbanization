// src/upload/upload.service.ts
import { Injectable, Logger } from '@nestjs/common'; // 导入 Logger
import { BusinessException } from '../common/exceptions/businessException';
import { ErrorCode } from '../../types/response';
import { getImagePath, UPLOAD_DIR } from '../utils/file-upload.utils'; // 导入 getImagePath 和 UPLOAD_DIR
import { unlink, readFile, readdir } from 'fs/promises'; // 导入 fs/promises 中的 unlink 用于异步删除文件
import { existsSync } from 'fs'; // 导入 existsSync
import { createHash } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';
import { join } from 'path';

// 可插拔的"图片在用收集器"类型定义
export type InUseImageCollector = () => Promise<Set<string>>;

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly inUseCollectors: InUseImageCollector[] = [];

  constructor(private readonly prisma: PrismaService) {
    // 默认注册：文章模块收集器（images 字段 + content 富文本图片）
    this.registerInUseImageCollector(async () => {
      const inUse = new Set<string>();
      const articles = await this.prisma.article.findMany({
        where: { delete: 0 },
        select: { images: true, content: true },
      });
      for (const article of articles) {
        const images = (article.images as unknown as string[]) || [];
        images.forEach((f) => inUse.add(f));
        const content =
          (article as unknown as { content?: string }).content || '';
        if (content.length > 0) {
          const names = this.parseImageFilenamesFromHtml(content);
          names.forEach((f) => inUse.add(f));
        }
      }
      return inUse;
    });
  }

  // ---------- 核心上传功能 ----------

  /**
   * 处理文件上传后的业务逻辑，例如保存文件信息到数据库
   * @param file 上传的文件对象
   * @returns 处理结果，包含文件信息和访问 URL
   */
  async processUploadedFile(file: Express.Multer.File) {
    const hash = await this.getFileHash(file.path);
    const originalName = file.originalname;

    const existingImage = await this.prisma.image.findFirst({
      where: {
        hash,
        delete: 0,
      },
    });

    if (existingImage) {
      // 如果文件已存在，删除刚刚上传的重复文件
      await unlink(file.path);
      this.logger.log(
        `重复文件: ${originalName}, 使用已存在的文件: ${existingImage.filename}`,
      );
      return {
        originalName,
        url: existingImage.filename, // 返回已存在文件的访问 "url" (即文件名)
      };
    }

    // 如果是新文件，保存到数据库
    await this.prisma.image.create({
      data: {
        filename: file.filename,
        originalName,
        hash,
      },
    });

    this.logger.log(`新文件已保存: ${file.filename}`);

    return {
      originalName,
      url: file.filename,
    };
  }

  // ---------- 文件删除功能 ----------

  /**
   * 根据文件名（UUID）删除服务器上的图片文件和数据库记录
   * @param filename 要删除的文件名（即UUID），包含扩展名
   * @returns 删除操作的结果
   */
  async deleteFile(filename: string) {
    const filePath = getImagePath(filename); // 获取文件的完整物理路径

    // 在尝试删除前，先查找数据库记录和文件是否存在
    const imageInDb = await this.prisma.image.findUnique({
      where: { filename },
    });
    const imageExistsOnDisk = existsSync(filePath);

    // 如果两者都不存在，说明已经清理干净，直接成功返回
    if (!imageInDb && !imageExistsOnDisk) {
      this.logger.warn(`试图删除一个不存在的图片文件和数据库记录: ${filename}`);
      return { delete: true };
    }

    try {
      // 如果数据库记录存在，则物理删除
      if (imageInDb) {
        await this.prisma.image.delete({
          where: { filename },
        });
        this.logger.log(`数据库图片记录已成功删除: ${filename}`);
      }

      // 如果物理文件存在，则删除它
      if (imageExistsOnDisk) {
        await unlink(filePath);
        this.logger.log(`物理图片文件已成功删除: ${filePath}`);
      }

      return {
        delete: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`删除图片 ${filename} 期间发生错误: ${errorMessage}`);
      throw new BusinessException(
        ErrorCode.BUSINESS_FAILED,
        `删除文件 ${filename} 失败。`,
      );
    }
  }

  /**
   * 批量删除图片（按文件名）
   * 使用现有 deleteFile 逐个删除，失败不会中断其他删除
   */
  async deleteImages(filenames: string[]): Promise<{
    deleted: string[];
    failed: { filename: string; error: string }[];
  }> {
    const deleted: string[] = [];
    const failed: { filename: string; error: string }[] = [];
    for (const name of filenames) {
      try {
        await this.deleteFile(name);
        deleted.push(name);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        failed.push({ filename: name, error: errorMessage });
      }
    }
    return { deleted, failed };
  }

  // ---------- 文件清理和孤立文件管理 ----------

  /**
   * 清理未被任何业务引用的图片
   * 当前支持引用来源：文章模块 Article（images 字段 + content 富文本内的 <img src>）
   * 后续可在此扩展其他模块的引用收集
   */
  async cleanupUnusedImages(candidateFilenames: string[]): Promise<void> {
    if (!Array.isArray(candidateFilenames) || candidateFilenames.length === 0) {
      return;
    }

    const inUse = await this.collectInUseImageFilenames();

    for (const filename of candidateFilenames) {
      try {
        if (!inUse.has(filename)) {
          await this.deleteFile(filename);
          this.logger.log(`清理未引用图片成功: ${filename}`);
        } else {
          this.logger.log(`图片仍在使用，跳过删除: ${filename}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`清理图片 ${filename} 失败: ${errorMessage}`);
      }
    }
  }

  /**
   * 列出系统中的"孤立图片"（未被任何业务引用）
   * 规则：
   * - 物理目录中的图片文件 不在 inUse 集合中
   * - 数据库 image 表中的记录 不在 inUse 集合中
   * 两者取并集返回，供前端操作
   */
  async listOrphanImages(): Promise<string[]> {
    // 1) 枚举物理目录下的所有图片文件名
    const uploadAbsDir = join(process.cwd(), UPLOAD_DIR);
    const diskFiles = existsSync(uploadAbsDir)
      ? await readdir(uploadAbsDir)
      : [];
    const imageRegex = /^[0-9a-zA-Z._-]+\.(?:png|jpe?g|gif|webp|svg)$/;
    const diskImageFiles = diskFiles.filter((f) => imageRegex.test(f));

    // 2) 获取数据库 image 表中的所有文件名
    const dbRows = await this.prisma.image.findMany({
      select: { filename: true },
    });
    const dbImageFiles = dbRows.map((r) => r.filename);

    // 3) 收集系统内正在使用的文件名集合
    const inUse = await this.collectInUseImageFilenames();

    // 4) 计算孤立集合（目录中未使用 ∪ 数据库未使用）
    const orphanSet = new Set<string>();
    for (const f of diskImageFiles) {
      if (!inUse.has(f)) orphanSet.add(f);
    }
    for (const f of dbImageFiles) {
      if (!inUse.has(f)) orphanSet.add(f);
    }

    return Array.from(orphanSet);
  }

  // ---------- 图片引用收集器管理 ----------

  // 允许其他业务模块注册其"在用图片收集器"
  registerInUseImageCollector(collector: InUseImageCollector) {
    this.inUseCollectors.push(collector);
  }

  /**
   * 收集当前系统中被引用的所有图片文件名
   * 迭代所有已注册的在用收集器并合并结果
   */
  private async collectInUseImageFilenames(): Promise<Set<string>> {
    const inUse = new Set<string>();

    for (const collector of this.inUseCollectors) {
      try {
        const set = await collector();
        for (const name of set) {
          inUse.add(name);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error(`在用图片收集器执行失败: ${errorMessage}`);
      }
    }

    return inUse;
  }

  // ---------- 工具方法 ----------

  private async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 对外公开：从富文本 HTML 内容中解析图片文件名
   * 支持以下 src 形式：
   * - /images/uuid.ext, //host/images/uuid.ext, http(s)://host/images/uuid.ext?x=1
   * - 仅文件名 uuid.ext
   */
  parseImageFilenamesFromHtml(content: string): string[] {
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
}
