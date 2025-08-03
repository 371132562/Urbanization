import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './exceptions/allExceptionsFilter';
import { ValidationPipe } from '@nestjs/common';
import { WinstonLoggerService } from './utils/logger.service';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors();

  // 配置请求体大小限制 - 设置为10MB以支持大批量数据导入
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

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

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
