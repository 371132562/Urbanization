import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  LoginDto,
  LoginResponseDto,
  TokenPayloadDto,
} from '../../../types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * 用户登录验证
   * @param loginDto 登录信息
   * @returns 登录响应，包含token和用户信息
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { code, password } = loginDto;
    this.logger.log(`[开始] 用户登录 - 用户编号: ${code}`);

    try {
      // 查找用户
      const user = await this.prisma.user.findFirst({
        where: {
          code,
          delete: 0, // 未删除的用户
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
        this.logger.warn(`[验证失败] 用户登录 - 用户编号 ${code} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      // 验证密码
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        this.logger.warn(`[验证失败] 用户登录 - 用户编号 ${code} 密码错误`);
        throw new BusinessException(ErrorCode.PASSWORD_INCORRECT, '密码错误');
      }

      // 生成JWT token
      const payload: TokenPayloadDto = {
        userId: user.id,
        userCode: user.code,
        userName: user.name,
        roleId: user.roleId || undefined,
        roleName: user.role?.name,
      };

      const token = this.jwtService.sign(payload);

      this.logger.log(
        `[成功] 用户登录 - 用户编号: ${code}, 姓名: ${user.name}`,
      );

      // 返回登录响应
      return {
        token,
        user: {
          id: user.id,
          code: user.code,
          name: user.name,
          department: user.department,
          email: user.email || undefined,
          phone: user.phone || undefined,
          roleId: user.roleId || undefined,
          role: user.role
            ? {
                id: user.role.id,
                name: user.role.name,
                description: user.role.description || undefined,
                allowedRoutes: user.role.allowedRoutes as string[],
              }
            : undefined,
        },
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 用户登录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 验证token并返回用户信息
   * @param token JWT token
   * @returns 用户信息
   */
  async validateToken(token: string) {
    this.logger.log('[开始] 验证用户Token');

    try {
      const payload = this.jwtService.verify(
        token,
      ) as unknown as TokenPayloadDto;

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
        this.logger.warn(
          `[验证失败] 验证Token - 用户ID ${payload.userId} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

      this.logger.log(
        `[成功] 验证用户Token - 用户ID: ${payload.userId}, 姓名: ${user.name}`,
      );

      return {
        userId: user.id,
        userCode: user.code,
        userName: user.name,
        roleId: user.roleId || undefined,
        roleName: user.role?.name,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description || undefined,
              allowedRoutes: user.role.allowedRoutes as string[],
            }
          : undefined,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error('[验证失败] 验证用户Token - Token无效或已过期');
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED, 'Token无效或已过期');
    }
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户详细信息
   */
  async getUserProfile(userId: string) {
    this.logger.log(`[开始] 获取用户信息 - 用户ID: ${userId}`);

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
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
        this.logger.warn(
          `[验证失败] 获取用户信息 - 用户ID ${userId} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

      this.logger.log(
        `[成功] 获取用户信息 - 用户ID: ${userId}, 姓名: ${user.name}`,
      );

      return {
        id: user.id,
        code: user.code,
        name: user.name,
        department: user.department,
        email: user.email || undefined,
        phone: user.phone || undefined,
        roleId: user.roleId || undefined,
        role: user.role
          ? {
              id: user.role.id,
              name: user.role.name,
              description: user.role.description || undefined,
              allowedRoutes: user.role.allowedRoutes as string[],
            }
          : undefined,
        createTime: user.createTime,
        updateTime: user.updateTime,
      };
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 获取用户信息 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
