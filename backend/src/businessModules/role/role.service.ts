import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  DeleteRoleDto,
  AssignRoleRoutesDto,
  RoleListResDto,
} from '../../../types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoleService {
  private readonly logger = new Logger(RoleService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取角色列表，包含用户数量
   */
  async getRoleList(): Promise<RoleListResDto> {
    this.logger.log('[开始] 获取角色列表');

    try {
      const roles = await this.prisma.role.findMany({
        where: { delete: 0 },
        include: { users: { where: { delete: 0 } } },
        orderBy: { createTime: 'asc' },
      });

      this.logger.log(`[成功] 获取角色列表 - 共 ${roles.length} 个角色`);

      return roles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description ?? undefined, // null转undefined
        allowedRoutes: Array.isArray(role.allowedRoutes)
          ? (role.allowedRoutes as unknown[]).filter(
              (r): r is string => typeof r === 'string',
            )
          : [], // 只保留字符串
        userCount: role.users.length,
        createTime: role.createTime,
        updateTime: role.updateTime,
      }));
    } catch (error) {
      this.logger.error(
        `[失败] 获取角色列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 创建角色
   */
  async createRole(dto: CreateRoleDto) {
    this.logger.log(`[开始] 创建角色 - 名称: ${dto.name}`);

    try {
      // 超管角色名admin不可创建
      if (dto.name === 'admin') {
        this.logger.warn(`[验证失败] 创建角色 - admin为系统保留角色名`);
        throw new BusinessException(
          ErrorCode.ROLE_NAME_EXIST,
          'admin为系统保留角色名',
        );
      }

      // 角色名唯一校验
      const exist = await this.prisma.role.findFirst({
        where: { name: dto.name, delete: 0 },
      });

      if (exist) {
        this.logger.warn(`[验证失败] 创建角色 - 角色名 ${dto.name} 已存在`);
        throw new BusinessException(ErrorCode.ROLE_NAME_EXIST, '角色名已存在');
      }

      await this.prisma.role.create({
        data: {
          name: dto.name,
          description: dto.description,
          allowedRoutes: dto.allowedRoutes,
        },
      });

      this.logger.log(`[成功] 创建角色 - 名称: ${dto.name}`);
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 创建角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 编辑角色
   */
  async updateRole(dto: UpdateRoleDto) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
      this.logger.log(
        role
          ? `[开始] 编辑角色 - ID: ${dto.id}, 名称: ${role.name}`
          : `[开始] 编辑角色 - ID: ${dto.id}`,
      );
      if (!role || role.delete !== 0) {
        this.logger.warn(`[验证失败] 编辑角色 - 角色ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
      }

      if (role.name === 'admin') {
        this.logger.warn(
          `[验证失败] 编辑角色 - 超管角色 ${role.name} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_EDIT_ADMIN,
          '超管角色不可编辑',
        );
      }

      // 角色名唯一校验
      if (dto.name && dto.name !== role.name) {
        const exist = await this.prisma.role.findFirst({
          where: { name: dto.name, delete: 0 },
        });
        if (exist) {
          this.logger.warn(`[验证失败] 编辑角色 - 角色名 ${dto.name} 已存在`);
          throw new BusinessException(
            ErrorCode.ROLE_NAME_EXIST,
            '角色名已存在',
          );
        }
      }

      await this.prisma.role.update({
        where: { id: dto.id },
        data: {
          name: dto.name ?? role.name,
          description: dto.description ?? role.description,
          allowedRoutes:
            dto.allowedRoutes !== undefined
              ? (dto.allowedRoutes as unknown as Prisma.InputJsonValue)
              : (role.allowedRoutes as unknown as Prisma.InputJsonValue),
        },
      });

      this.logger.log(
        `[成功] 编辑角色 - ID: ${dto.id}, 名称: ${dto.name || role.name}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 编辑角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 删除角色（软删除）
   */
  async deleteRole(dto: DeleteRoleDto) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
      this.logger.log(
        role
          ? `[开始] 删除角色 - ID: ${dto.id}, 名称: ${role.name}`
          : `[开始] 删除角色 - ID: ${dto.id}`,
      );
      if (!role || role.delete !== 0) {
        this.logger.warn(`[验证失败] 删除角色 - 角色ID ${dto.id} 不存在`);
        throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
      }

      if (role.name === 'admin') {
        this.logger.warn(
          `[验证失败] 删除角色 - 超管角色 ${role.name} 不可删除`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_DELETE_ADMIN,
          '超管角色不可删除',
        );
      }

      // 检查是否有用户关联该角色
      const userCount = await this.prisma.user.count({
        where: { roleId: dto.id, delete: 0 },
      });
      if (userCount > 0) {
        this.logger.warn(
          `[验证失败] 删除角色 - 角色 ${role.name} 有 ${userCount} 个用户关联，无法删除`,
        );
        throw new BusinessException(
          ErrorCode.DATA_STILL_REFERENCED,
          '有用户关联该角色，无法删除',
        );
      }

      await this.prisma.role.update({
        where: { id: dto.id },
        data: { delete: 1 },
      });

      this.logger.log(`[成功] 删除角色 - ID: ${dto.id}, 名称: ${role.name}`);
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除角色 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 分配角色菜单权限
   */
  async assignRoleRoutes(dto: AssignRoleRoutesDto) {
    try {
      const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
      this.logger.log(
        role
          ? `[开始] 分配角色菜单权限 - 角色ID: ${dto.id}, 名称: ${role.name}`
          : `[开始] 分配角色菜单权限 - 角色ID: ${dto.id}`,
      );
      if (!role || role.delete !== 0) {
        this.logger.warn(
          `[验证失败] 分配角色菜单权限 - 角色ID ${dto.id} 不存在`,
        );
        throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
      }

      if (role.name === 'admin') {
        this.logger.warn(
          `[验证失败] 分配角色菜单权限 - 超管角色 ${role.name} 不可编辑`,
        );
        throw new BusinessException(
          ErrorCode.ROLE_CANNOT_EDIT_ADMIN,
          '超管角色不可编辑',
        );
      }

      const filteredRoutes = (dto.allowedRoutes as unknown[]).filter(
        (r): r is string => typeof r === 'string',
      );

      await this.prisma.role.update({
        where: { id: dto.id },
        data: {
          allowedRoutes: filteredRoutes,
        },
      });

      this.logger.log(
        `[成功] 分配角色菜单权限 - 角色ID: ${dto.id}, 名称: ${role.name}, 权限数量: ${filteredRoutes.length}`,
      );
      return true;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 分配角色菜单权限 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
