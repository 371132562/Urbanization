import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateRoleDto,
  UpdateRoleDto,
  DeleteRoleDto,
  AssignRoleRoutesDto,
  RoleListResDto,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Prisma } from '@prisma/client';

@Injectable()
export class RoleService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取角色列表，包含用户数量
   */
  async getRoleList(): Promise<RoleListResDto> {
    const roles = await this.prisma.role.findMany({
      where: { delete: 0 },
      include: { users: { where: { delete: 0 } } },
      orderBy: { createTime: 'asc' },
    });
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
  }

  /**
   * 创建角色
   */
  async createRole(dto: CreateRoleDto) {
    // 超管角色名admin不可创建
    if (dto.name === 'admin') {
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
      throw new BusinessException(ErrorCode.ROLE_NAME_EXIST, '角色名已存在');
    }
    await this.prisma.role.create({
      data: {
        name: dto.name,
        description: dto.description,
        allowedRoutes: dto.allowedRoutes,
      },
    });
    return true;
  }

  /**
   * 编辑角色
   */
  async updateRole(dto: UpdateRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
    if (!role || role.delete !== 0) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
    }
    if (role.name === 'admin') {
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
        throw new BusinessException(ErrorCode.ROLE_NAME_EXIST, '角色名已存在');
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
    return true;
  }

  /**
   * 删除角色（软删除）
   */
  async deleteRole(dto: DeleteRoleDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
    if (!role || role.delete !== 0) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
    }
    if (role.name === 'admin') {
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
      throw new BusinessException(
        ErrorCode.DATA_STILL_REFERENCED,
        '有用户关联该角色，无法删除',
      );
    }
    await this.prisma.role.update({
      where: { id: dto.id },
      data: { delete: 1 },
    });
    return true;
  }

  /**
   * 分配角色菜单权限
   */
  async assignRoleRoutes(dto: AssignRoleRoutesDto) {
    const role = await this.prisma.role.findUnique({ where: { id: dto.id } });
    if (!role || role.delete !== 0) {
      throw new BusinessException(ErrorCode.ROLE_NOT_FOUND, '角色不存在');
    }
    if (role.name === 'admin') {
      throw new BusinessException(
        ErrorCode.ROLE_CANNOT_EDIT_ADMIN,
        '超管角色不可编辑',
      );
    }
    await this.prisma.role.update({
      where: { id: dto.id },
      data: {
        allowedRoutes: (dto.allowedRoutes as unknown[]).filter(
          (r): r is string => typeof r === 'string',
        ),
      },
    });
    return true;
  }
}
