import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseBody } from '../../types/response';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseBody<T>>
{
  private readonly logger = new Logger(TransformInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseBody<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    return next.handle().pipe(
      map((data: T) => {
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
