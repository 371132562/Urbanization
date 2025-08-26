import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContext } from '../context/request-context.utils';

/**
 * 请求上下文初始化中间件（RequestContextMiddleware）
 * 用途：为每个进入的 HTTP 请求初始化一个 ALS 上下文，注入 requestId、method、path
 * 上游：全局中间件链最早阶段执行（AppModule.configure 注册）
 * 下游：UserContextInterceptor 补充 user，WinstonLoggerService 从上下文读取并拼接日志前缀
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // 生成/复用 requestId（上游：客户端可通过 X-Request-Id 传入）
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    // 记录请求路径与方法（下游：日志与排障）
    const path =
      (req as Request & { originalUrl?: string }).originalUrl ?? req.url;
    // 在 ALS 中运行本次请求的调用链（下游：其后所有处理均可读取上下文）
    RequestContext.run({ requestId, method: req.method, path }, next);
  }
}
