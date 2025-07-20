// src/upload/upload.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'; // 导入 Logger, NotFoundException
import { BusinessException } from '../exceptions/businessException';
import { ErrorCode } from '../../types/response';
import { getImagePath } from '../utils/file-upload.utils'; // 导入 getImagePath
import { unlink, readFile } from 'fs/promises'; // 导入 fs/promises 中的 unlink 用于异步删除文件
import { existsSync } from 'fs'; // 导入 existsSync
import { createHash } from 'crypto';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  constructor(private readonly prisma: PrismaService) {}

  private async getFileHash(filePath: string): Promise<string> {
    const fileBuffer = await readFile(filePath);
    return createHash('sha256').update(fileBuffer).digest('hex');
  }

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

  /**
   * 根据文件名（UUID）删除服务器上的图片文件
   * @param filename 要删除的文件名（即UUID），包含扩展名
   * @returns 删除操作的结果
   */
  async deleteFile(filename: string) {
    const filePath = getImagePath(filename); // 获取文件的完整物理路径

    // 1. 检查文件是否存在
    if (!existsSync(filePath)) {
      this.logger.warn(`文件不存在，无法删除: ${filePath}`);
      throw new NotFoundException(`文件 ${filename} 不存在。`);
    }

    // 2. 尝试删除文件
    try {
      await unlink(filePath); // 使用异步删除
      this.logger.log(`文件已成功删除: ${filePath}`);

      // 在实际项目中，你还需要在这里从数据库中删除对应的文件记录
      // 例如：await this.imageRepository.delete({ filename: filename });

      return {
        delete: true,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`删除文件 ${filePath} 失败: ${errorMessage}`);
      throw new BusinessException(
        ErrorCode.BUSINESS_FAILED,
        `删除文件 ${filename} 失败。`,
      );
    }
  }
}
