import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
  Logger,
  StreamableFile,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, any> {
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data: T) => {
        // 如果是文件流，直接返回，不进行包装
        if (data instanceof StreamableFile) {
          this.logger.log(
            `【${request.method}】${request.url} - 响应类型为文件流，跳过JSON包装`,
          );
          return data;
        }

        const duration = Date.now() - startTime;
        this.logger.log(
          `【${request.method}】${request.url} - ${response.statusCode} - ${duration}ms`,
        );
        response.statusCode = 200; // 强制设置为 200
        return { code: 10000, msg: '成功', data };
      }),
    );
  }
}
