import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs'; // 导入 unlinkSync
import { diskStorage } from 'multer';
import { v4 as uuid } from 'uuid';

// 定义上传文件的根目录，所有文件都将存放在这里
export const UPLOAD_DIR = process.env.UPLOAD_DIR as string; // 直接指定一个通用文件夹

// Multer 上传选项配置
export const multerOptions = {
  // 文件大小限制：10MB
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  // 文件存储配置
  storage: diskStorage({
    destination: (req: any, file: any, cb: any) => {
      // 检查目录是否存在，如果不存在则递归创建
      if (!existsSync(UPLOAD_DIR)) {
        mkdirSync(UPLOAD_DIR, { recursive: true });
      }
      cb(null, UPLOAD_DIR); // 直接使用通用上传目录
    },
    // 定义上传文件的文件名
    filename: (req: any, file: any, cb: any) => {
      // 生成一个唯一的 UUID 作为文件名，并保留原始文件的扩展名
      cb(null, `${uuid()}${extname(file.originalname)}`);
    },
  }),
  // 文件过滤：只允许图片类型（jpg, jpeg, png, gif）
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype.match(/^image\//)) {
      cb(null, true); // 允许上传
    } else {
      cb(new Error(`不支持的文件类型: ${extname(file.originalname)}`), false); // 拒绝上传
    }
  },
};

// 获取图片的完整物理路径
export const getImagePath = (filename: string): string => {
  // 注意：这里需要根据你的实际存储结构来构建路径。
  // 如果你所有图片都在 UPLOAD_DIR 下，直接 join 即可。
  // 如果你之前保留了 moduleName，这里可能需要传入 moduleName
  // 例如：join(process.cwd(), UPLOAD_DIR, filename) 或
  // join(process.cwd(), './uploads', moduleName, filename)

  return join(process.cwd(), UPLOAD_DIR, filename);
};
