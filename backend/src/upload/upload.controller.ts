// src/upload/upload.controller.ts
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile, // 导入 UploadedFile
  BadRequestException,
  Body,
  Res, // 导入 Res
} from '@nestjs/common';
import { Response } from 'express'; // 导入 Response
import { FileInterceptor } from '@nestjs/platform-express'; // 导入 FileInterceptor
import { multerOptions } from '../utils/file-upload.utils';
import { UploadService } from './upload.service';

@Controller('upload') // 基础路由 /upload
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions)) // 'file' 是表单字段名
  uploadImage(@UploadedFile() file: Express.Multer.File, @Res() res: Response) {
    try {
      // 基本校验
      if (!file) {
        // 直接返回 wangeditor 要求的失败格式
        return res.status(200).json({
          errno: 1, // 只要不等于 0 就行
          message: '没有文件被上传',
        });
      }

      // 注意：service 层可以保持不变，因为 controller 需要根据 wangeditor 的要求来定制响应
      const result = this.uploadService.processUploadedFile(file);

      // 直接返回 wangeditor 要求的成功格式
      return res.status(200).json({
        errno: 0, // 注意：值是数字，不能是字符串
        data: {
          url: result.url, // 图片 src ，现在只返回文件名
          alt: file.originalname, // 图片描述文字，非必须
          // href: "zzz" // 图片的链接，非必须
        },
      });
    } catch (error) {
      // 捕获所有潜在错误，包括 fileFilter 的错误
      return res.status(200).json({
        errno: 1, // 只要不等于 0 就行
        message: (error as Error).message || '上传失败',
      });
    }
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
