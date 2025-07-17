import { Module } from '@nestjs/common';
import { join } from 'path';

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

@Module({
  imports: [
    //公共模块
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.cwd(), process.env.UPLOAD_DIR as string), // 静态文件在服务器上的物理路径
        serveRoot: `/${(process.env.UPLOAD_DIR as string).replace('./', '')}`, // URL 前缀，例如 /uploads/images
        // serveRoot: '/', // 可以省略，默认就是 '/'
        exclude: ['/'], // 可选：排除不需要提供静态服务的路由
      },
      {
        // 根据环境动态设置前端静态资源的根路径
        // 在生产环境中，__dirname 是 .../resources/backend/dist，
        // 所以我们需要向上回溯两层到 resources 目录，再进入 'frontend-dist'
        // 在开发环境中，我们直接使用 process.cwd() 定位到 monorepo 根目录
        rootPath: isProd
          ? join(__dirname, '..', '..', 'frontend-dist')
          : join(process.cwd(), 'frontend', 'dist'),
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
