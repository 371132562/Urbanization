import {
  Injectable,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ErrorCode } from '../../../types/response';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../common/auth/public.decorator';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.split(' ')[1]; // 获取 token

    // 如果没有 token，直接返回 true，允许访问
    if (!token) {
      return true; // 允许访问
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // 对于非公开接口，必须进行JWT验证
    return super.canActivate(context);
  }
  handleRequest<TUser = any>(err: any, user: any): TUser {
    if (err || !user) {
      // 根据错误类型返回不同的错误信息
      if (
        err &&
        typeof err === 'object' &&
        (err as { name?: string }).name === 'TokenExpiredError'
      ) {
        throw new UnauthorizedException({
          code: ErrorCode.TOKEN_EXPIRED,
          message: 'Token已过期，请重新登录',
        });
      } else if (
        err &&
        typeof err === 'object' &&
        (err as { name?: string }).name === 'JsonWebTokenError'
      ) {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: 'Token无效，请重新登录',
        });
      } else {
        throw new UnauthorizedException({
          code: ErrorCode.UNAUTHORIZED,
          message: '认证失败，请登录',
        });
      }
    }
    return user as TUser;
  }
}
