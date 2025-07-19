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
import { ScoreModule } from './businessComponent/score/score.module';

@Module({
  imports: [
    //公共模块
    // 配置 @nestjs/serve-static 模块来提供静态文件服务
    ServeStaticModule.forRoot(
      {
        rootPath: join(process.env.UPLOAD_DIR as string), // 静态文件在服务器上的物理路径
        serveRoot: `/images`, // URL 前缀，例如 /uploads/images
        // serveRoot: '/', // 可以省略，默认就是 '/'
        exclude: ['/'], // 可选：排除不需要提供静态服务的路由
      },
      {
        rootPath: join(process.cwd(), 'frontend', 'dist'), // 指向 monorepo 根目录下的 frontend/dist
        // serveRoot: '/', // 可以省略，默认就是 '/'
        serveStaticOptions: {
          preCompressed: true,
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
    ScoreModule, // 评分评价模块
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
