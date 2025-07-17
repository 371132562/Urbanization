import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './exceptions/allExceptionsFilter';
import { ValidationPipe } from '@nestjs/common';
import { WinstonLoggerService } from './utils/logger.service';
import { execSync } from 'child_process';
import * as path from 'path';

async function bootstrap() {
  // 在应用启动前，确保数据库迁移是最新的
  // 这对于 Electron 应用在客户端首次启动或更新后至关重要
  try {
    // 构建到 prisma CLI 和 schema 文件的路径
    const prismaCliPath = path.join(
      __dirname,
      '..',
      '..',
      'node_modules',
      'prisma',
      'build',
      'index.js',
    );
    const schemaPath = path.join(
      __dirname,
      '..',
      '..',
      'prisma',
      'schema.prisma',
    );

    console.log('Running prisma migrate deploy...');
    // 直接使用 node 执行 prisma 的 cli 脚本，移除对 npx 的依赖，更稳定
    execSync(
      `node "${prismaCliPath}" migrate deploy --schema="${schemaPath}"`,
      { stdio: 'inherit' },
    );
    console.log('Prisma migrate deploy completed.');
  } catch (e) {
    console.error('Failed to run prisma migrate deploy:', e);
    process.exit(1);
  }

  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors();

  // 注册全局拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 注册全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 添加全局路径前缀
  app.setGlobalPrefix('urbanization');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
