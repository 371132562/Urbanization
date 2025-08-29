import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserListResDto,
  CreateUserDto,
  UpdateUserDto,
  DeleteUserDto,
  ResetUserPasswordDto,
} from '../../../types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户列表，包含角色名
   */
  async getUserList(): Promise<UserListResDto> {
    this.logger.log('[开始] 获取用户列表');

    try {
      const users = await this.prisma.user.findMany({
        where: { delete: 0 },
        include: { role: true },
        orderBy: { createTime: 'asc' },
      });

      this.logger.log(`[成功] 获取用户列表 - 共 ${users.length} 个用户`);

      return users.map((user) => ({
        id: user.id,
        code: user.code,
        name: user.name,
        department: user.department,
        email: user.email ?? undefined,
        phone: user.phone ?? undefined,
        roleId: user.roleId ?? undefined,
        roleName: user.role?.name ?? undefined,
        createTime: user.createTime,
        updateTime: user.updateTime,
      }));
    } catch (error) {
      this.logger.error(
        `[失败] 获取用户列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDto) {
    this.logger.log(`[开始] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);

    try {
      if (dto.code === '88888888') {
        this.logger.warn(`[验证失败] 创建用户 - 超管编号 ${dto.code} 不可用`);
        throw new BusinessException(
          ErrorCode.USER_CODE_EXIST,
          '超管编号不可用',
        );
      }

      // 编号唯一校验
      const exist = await this.prisma.user.findFirst({
        where: { code: dto.code, delete: 0 },
      });

      if (exist) {
        this.logger.warn(`[验证失败] 创建用户 - 用户编号 ${dto.code} 已存在`);
        throw new BusinessException(
          ErrorCode.USER_CODE_EXIST,
          '用户编号已存在',
        );
      }

      const password = await bcrypt.hash(dto.password, 10);
      await this.prisma.user.create({
        data: {
          code: dto.code,
          name: dto.name,
          department: dto.department,
          email: dto.email,
          phone: dto.phone,
          password,
          roleId: dto.roleId,
        },
      });

      this.logger.log(`[成功] 创建用户 - 编号: ${dto.code}, 姓名: ${dto.name}`);
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 编辑用户
   */
  async updateUser(dto: UpdateUserDto) {
    try {
      // 先获取用户信息，便于输出更友好的日志
      const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
      this.logger.log(
        user
          ? `[开始] 编辑用户 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`
          : `[开始] 编辑用户 - ID: ${dto.id}`,
      );
      if (!user || user.delete !== 0) {
        this.logger.warn(`[验证失败] 编辑用户 - 用户ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      if (user.code === '88888888') {
        this.logger.warn(
          `[验证失败] 编辑用户 - 超管用户 ${user.code} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_EDIT_ADMIN,
          '超管用户不可编辑',
        );
      }

      await this.prisma.user.update({
        where: { id: dto.id },
        data: {
          name: dto.name ?? user.name,
          department: dto.department ?? user.department,
          email: dto.email ?? user.email,
          phone: dto.phone ?? user.phone,
          roleId: dto.roleId ?? user.roleId,
        },
      });

      this.logger.log(
        `[成功] 编辑用户 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${dto.name || user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 编辑用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(dto: DeleteUserDto) {
    try {
      // 先获取用户信息，便于输出更友好的日志
      const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
      this.logger.log(
        user
          ? `[开始] 删除用户 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`
          : `[开始] 删除用户 - ID: ${dto.id}`,
      );
      if (!user || user.delete !== 0) {
        this.logger.warn(`[验证失败] 删除用户 - 用户ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      if (user.code === '88888888') {
        this.logger.warn(
          `[验证失败] 删除用户 - 超管用户 ${user.code} 不可删除`,
        );
        throw new BusinessException(
          ErrorCode.USER_CANNOT_DELETE_ADMIN,
          '超管用户不可删除',
        );
      }

      await this.prisma.user.update({
        where: { id: dto.id },
        data: { delete: 1 },
      });

      this.logger.log(
        `[成功] 删除用户 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除用户 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(dto: ResetUserPasswordDto) {
    try {
      // 先获取用户信息，便于输出更友好的日志
      const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
      this.logger.log(
        user
          ? `[开始] 重置用户密码 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`
          : `[开始] 重置用户密码 - ID: ${dto.id}`,
      );
      if (!user || user.delete !== 0) {
        this.logger.warn(`[验证失败] 重置用户密码 - 用户ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
      }

      const password = await bcrypt.hash(dto.newPassword, 10);
      await this.prisma.user.update({
        where: { id: dto.id },
        data: { password },
      });

      this.logger.log(
        `[成功] 重置用户密码 - ID: ${dto.id}, 编号: ${user.code}, 姓名: ${user.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 重置用户密码 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
