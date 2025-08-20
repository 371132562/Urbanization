import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import { RequestContext } from '../../utils/request-context';

/**
 * 用户上下文写入拦截器（UserContextInterceptor）
 * 用途：在 Jwt 守卫通过后，将 req.user 中的关键用户标识写入 RequestContext
 * 上游：JwtAuthGuard -> JwtStrategy.validate 填充 req.user
 * 下游：WinstonLoggerService 从 RequestContext 读取用户，统一日志前缀 [用户编号] [用户名称]
 */
@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest<Request & { user?: any }>();
    if (req && req.user) {
      // JwtStrategy.validate 返回字段：userId、userCode、userName
      const { userCode, userName } = req.user as {
        userCode?: string | number;
        userName?: string;
      };
      RequestContext.setUser({
        id: userCode ?? '访客',
        username: userName ?? '访客',
      });
    }
    return next.handle();
  }
}
