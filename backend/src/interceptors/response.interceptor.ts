import {
  Injectable,
  NestInterceptor,
  CallHandler,
  ExecutionContext,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseBody } from '../../types/response';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ResponseBody<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ResponseBody<T>> {
    const response = context.switchToHttp().getResponse();
    return next.handle().pipe(
      map((data) => {
        response.statusCode = 200; // 强制设置为 200
        return { code: 10000, msg: '成功', data };
      }),
    );
  }
}
