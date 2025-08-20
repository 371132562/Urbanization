import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { LoginDto, LoginResponseDto, TokenPayloadDto } from '../../types/dto';
import { BusinessException } from '../common/exceptions/businessException';
import { ErrorCode } from '../../types/response';

@Injectable()
export class AuthService {
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
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
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
  }

  /**
   * 验证token并返回用户信息
   * @param token JWT token
   * @returns 用户信息
   */
  async validateToken(token: string) {
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
        throw new BusinessException(
          ErrorCode.USER_NOT_FOUND,
          '用户不存在或已被删除',
        );
      }

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
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_EXPIRED, 'Token无效或已过期');
    }
  }

  /**
   * 获取用户信息
   * @param userId 用户ID
   * @returns 用户详细信息
   */
  async getUserProfile(userId: string) {
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
      throw new BusinessException(
        ErrorCode.USER_NOT_FOUND,
        '用户不存在或已被删除',
      );
    }

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
  }
}
