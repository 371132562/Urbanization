// src/upload/upload.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common'; // 导入 Logger, NotFoundException
import { BusinessException } from '../exceptions/businessException';
import { ErrorCode } from '../../types/response';
import { getImagePath } from '../utils/file-upload.utils'; // 导入 getImagePath
import { unlink } from 'fs/promises'; // 导入 fs/promises 中的 unlink 用于异步删除文件
import { existsSync } from 'fs'; // 导入 existsSync

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /**
   * 处理文件上传后的业务逻辑，例如保存文件信息到数据库
   * @param file 上传的文件对象
   * @returns 处理结果，包含文件信息和访问 URL
   */
  processUploadedFile(file: Express.Multer.File) {
    this.logger.log(file.originalname);
    return {
      originalName: file.originalname,
      url: file.filename, // 可通过服务访问的 URL
      mimetype: file.mimetype,
      size: file.size,
      // 可以在这里添加其他元数据，如上传时间、上传用户ID等
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
