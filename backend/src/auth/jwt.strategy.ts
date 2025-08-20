import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenPayloadDto } from '../../types/dto';
import { BusinessException } from '../common/exceptions/businessException';
import { ErrorCode } from '../../types/response';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // 从Authorization头中提取Bearer token
      ignoreExpiration: false, // 不忽略过期时间
      secretOrKey: 'urbanization-jwt-secret-key-2024', // JWT密钥（硬编码）
    });
  }

  /**
   * 验证JWT token并返回用户信息
   * @param payload JWT payload
   * @returns 用户信息
   */
  async validate(payload: TokenPayloadDto) {
    try {
      // 验证用户是否仍然存在且未删除
      const user = await this.prisma.user.findFirst({
        where: {
          id: payload.userId,
          delete: 0,
        },
        include: {
          role: {
            select: {
              id: true,
              name: true,
              description: true,
              allowedRoutes: true,
            },
          },
        },
      });

      if (!user) {
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

      // 返回用户信息，这些信息会被注入到请求对象中
      return {
        userId: user.id,
        userCode: user.code,
        userName: user.name,
        department: user.department,
        email: user.email,
        phone: user.phone,
        roleId: user.roleId,
        roleName: user.role?.name,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description,
              allowedRoutes: user.role.allowedRoutes as string[],
            }
          : undefined,
      };
    } catch (error) {
      // 如果是已知的BusinessException，直接抛出
      if (error instanceof BusinessException) {
        throw error;
      }
      // 其他错误统一处理
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new BusinessException(
        ErrorCode.TOKEN_EXPIRED,
        'Token验证失败：' + errorMessage,
      );
    }
  }
}
