import { Module } from '@nestjs/common';
import { join } from 'path';
import * as fs from 'fs';

//公共模块
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from './upload/upload.module';

//业务模块
import { DataManagementModule } from './businessComponent/dataManagement/dataManagement.module';
import { IndicatorModule } from './businessComponent/indicator/indicator.module';
import { CountryAndContinentModule } from './businessComponent/countryAndContinent/countryAndContinent.module';
import { ArticleModule } from './businessComponent/article/article.module';

// 判断是否为生产环境（在 Electron 中打包后，NODE_ENV 会被设置成 'production'）
const isProd = process.env.NODE_ENV === 'production';

// 查找可能的前端资源路径
function findFrontendPath(): string {
  if (!isProd) {
    return join(process.cwd(), 'frontend', 'dist');
  }

  // 从环境变量获取的路径
  const pathFromEnv = process.env.RESOURCES_PATH
    ? join(process.env.RESOURCES_PATH, 'frontend-dist')
    : '';

  // 尝试多种可能的路径
  const possiblePaths = [
    // 环境变量路径
    pathFromEnv,
    // __dirname相对路径 (回溯4层)
    join(__dirname, '..', '..', '..', '..', 'frontend-dist'),
    // __dirname相对路径 (回溯5层)
    join(__dirname, '..', '..', '..', '..', '..', 'frontend-dist'),
    // 绝对路径前部分(从错误信息推断)
    process.env.APP_PATH
      ? join(process.env.APP_PATH, 'Contents', 'Resources', 'frontend-dist')
      : '',
    // 去掉backend的路径
    pathFromEnv
      ? pathFromEnv.replace('/backend/frontend-dist', '/frontend-dist')
      : '',
  ].filter(Boolean);

  // 检查每个路径是否存在
  for (const path of possiblePaths) {
    console.log(`检查路径: ${path}`);
    if (fs.existsSync(path)) {
      console.log(`找到有效的前端路径: ${path}`);
      return path;
    }
  }

  console.log('未找到有效的前端路径，使用默认路径');
  return (
    pathFromEnv || join(__dirname, '..', '..', '..', '..', 'frontend-dist')
  );
}

// 调试日志
const frontendPath = findFrontendPath();

console.log('环境变量信息:');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('RESOURCES_PATH:', process.env.RESOURCES_PATH);
console.log('前端资源路径:', frontendPath);
console.log(
  '前端资源路径11:',
  (process.env.RESOURCES_PATH || '', 'frontend-dist'),
);

// 检查目录是否存在
// if (isProd) {
//   console.log('检查资源目录...');
//   // 检查 RESOURCES_PATH 目录
//   const resourcesPath = process.env.RESOURCES_PATH || '';
//   console.log(
//     `RESOURCES_PATH ${resourcesPath} 存在:`,
//     fs.existsSync(resourcesPath),
//   );

//   // 列出 RESOURCES_PATH 目录内容
//   try {
//     const files = fs.readdirSync(resourcesPath);
//     console.log(`RESOURCES_PATH 目录内容:`, files);
//   } catch (err) {
//     console.log(
//       '无法读取 RESOURCES_PATH 目录:',
//       err instanceof Error ? err.message : String(err),
//     );
//   }

//   // 检查前端资源目录
//   console.log(
//     `前端资源路径 ${frontendPath} 存在:`,
//     fs.existsSync(frontendPath),
//   );

//   // 检查 index.html
//   const indexPath = join(frontendPath, 'index.html');
//   console.log(`index.html 路径 ${indexPath} 存在:`, fs.existsSync(indexPath));
// }

@Module({
  imports: [
    //公共模块
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.env.UPLOAD_DIR as string), // 静态文件在服务器上的物理路径
        serveRoot: `/${(process.env.UPLOAD_DIR as string).replace('./', '')}`, // URL 前缀，例如 /uploads/images
        // serveRoot: '/', // 可以省略，默认就是 '/'
        exclude: ['/'], // 可选：排除不需要提供静态服务的路由
      },
      {
        // 根据环境动态设置前端静态资源的根路径
        // 在生产环境中，静态资源会被复制到 Resources/frontend-dist 目录
        rootPath: join(process.env.RESOURCES_PATH || '', 'frontend-dist'),
        serveStaticOptions: {
          preCompressed: true, // 如果前端构建时生成了 .gz 文件，可以开启以提升性能
        },
      },
    ),
    PrismaModule,
    UploadModule, // 上传模块

    //业务模块
    DataManagementModule,
    IndicatorModule, // 指标查询模块
    CountryAndContinentModule, // 国家和大洲模块
    ArticleModule, // 文章管理模块
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
