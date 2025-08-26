import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage, FileFilterCallback } from 'multer';
import { v4 as uuid } from 'uuid';
import { Request } from 'express';

/**
 * Multer 文件上传配置工具
 * 用途：集中定义上传目录、存储策略、文件命名、类型过滤与路径拼接
 * 上游：上传 Controller 中使用 @UseInterceptors(FileInterceptor(...)) 时引入 `multerOptions`
 * 下游：物理保存到磁盘目录（由 UPLOAD_DIR 决定），并在业务层使用 `getImagePath` 拼接绝对路径
 */

// 定义 multer 的回调类型（下游：供 storage 回调签名使用）
type DestinationCallback = (error: Error | null, destination: string) => void;
type FileNameCallback = (error: Error | null, filename: string) => void;

// 定义上传文件的根目录，所有文件都将存放在这里（下游：磁盘路径）
export const UPLOAD_DIR = process.env.UPLOAD_DIR as string;

// Multer 上传选项配置（上游：被上传拦截器使用）
export const multerOptions = {
  // 文件大小限制：10MB
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  // 文件存储配置
  storage: diskStorage({
    destination: (
      req: Request,
      file: Express.Multer.File,
      cb: DestinationCallback,
    ) => {
      // 目录不存在则递归创建（下游：保证磁盘写入成功）
      if (!existsSync(UPLOAD_DIR)) {
        mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      cb(null, UPLOAD_DIR);
    },
    // 定义上传文件的文件名（下游：使用 uuid + 原扩展名）
    filename: (
      req: Request,
      file: Express.Multer.File,
      cb: FileNameCallback,
    ) => {
      // 解决中文文件名乱码问题（上游：浏览器上传的 latin1 -> utf8）
      file.originalname = Buffer.from(file.originalname, 'latin1').toString(
        'utf8',
      );
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  }),
  // 文件过滤：仅允许图片类型（上游：保护后端，拒绝不安全类型）
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) => {
    if (file.mimetype.match(/^image\//)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${extname(file.originalname)}`));
    }
  },
};

// 获取图片的完整物理路径（下游：结合业务持久化的文件名）
export const getImagePath = (filename: string): string => {
  // 注意：这里需要根据你的实际存储结构来构建路径。
  // 如果你所有图片都在 UPLOAD_DIR 下，直接 join 即可。
  // 如果你之前保留了 moduleName，这里可能需要传入 moduleName
  // 例如：join(process.cwd(), UPLOAD_DIR, filename) 或
  // join(process.cwd(), './uploads', moduleName, filename)

  return join(process.cwd(), UPLOAD_DIR, filename);
};
