// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile, // 导入 UploadedFile
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express'; // 导入 FileInterceptor
import { multerOptions } from '../utils/file-upload.utils';
import { UploadService } from './upload.service';

@Controller('upload') // 基础路由 /upload
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions)) // 'file' 是表单字段名
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    // 基本校验
    if (!file) {
      throw new BadRequestException('没有文件被上传。');
    }

    // 调用服务处理文件信息
    const result = await this.uploadService.processUploadedFile(file);

    return {
      originalName: Buffer.from(file.originalname, 'latin1').toString('utf-8'),
      filename: file.filename,
      path: file.path, // 文件在服务器上的物理路径
      url: result.url, // 获取可访问的 URL
    };
  }

  @Post('delete') // 完整路由 /upload/:filename (删除)
  async deleteImage(@Body('filename') filename: string) {
    // 简单校验 filename 是否是有效的 UUID 格式 (可选，但推荐)
    // 如果你的 UUID 总是包含扩展名，确保这里也考虑到
    // 例如：/^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}\.(jpg|jpeg|png|gif)$/i.test(filename)

    // 在调用服务前，可以再次确认传入的 filename 是否合法，防止删除任意文件
    if (!filename || filename.length < 10) {
      // 简单的长度校验，防止空或过短的 filename
      throw new BadRequestException('无效的文件名。');
    }

    // 调用服务执行删除逻辑
    await this.uploadService.deleteFile(filename);
  }
}
