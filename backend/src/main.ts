import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/exceptions/allExceptionsFilter';
import { ValidationPipe } from '@nestjs/common';
import { WinstonLoggerService } from './utils/logger.service';
import { json, urlencoded } from 'express';
import { UserContextInterceptor } from './common/interceptors/user-context.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  app.enableCors();

  // 配置请求体大小限制 - 设置为10MB以支持大批量数据导入
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // 注册全局拦截器（先写入用户上下文，再做统一响应包装）
  app.useGlobalInterceptors(
    new UserContextInterceptor(),
    new TransformInterceptor(),
  );

  // 注册全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter());

  // 添加全局路径前缀
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3333);
}
bootstrap();
