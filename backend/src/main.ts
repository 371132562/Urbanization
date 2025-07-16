import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TransformInterceptor } from './interceptors/response.interceptor';
import { AllExceptionsFilter } from './exceptions/allExceptionsFilter';
import { ValidationPipe } from '@nestjs/common';
import { logger } from './utils/logger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // 将我们自定义的 logger 提供给 NestJS
    logger: logger,
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
