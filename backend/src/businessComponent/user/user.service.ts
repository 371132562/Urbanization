import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  UserListResDto,
  CreateUserDto,
  UpdateUserDto,
  DeleteUserDto,
  ResetUserPasswordDto,
} from '../../../types/dto';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取用户列表，包含角色名
   */
  async getUserList(): Promise<UserListResDto> {
    const users = await this.prisma.user.findMany({
      where: { delete: 0 },
      include: { role: true },
      orderBy: { createTime: 'asc' },
    });
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
  }

  /**
   * 创建用户
   */
  async createUser(dto: CreateUserDto) {
    if (dto.code === '88888888') {
      throw new BusinessException(ErrorCode.USER_CODE_EXIST, '超管编号不可用');
    }
    // 编号唯一校验
    const exist = await this.prisma.user.findFirst({
      where: { code: dto.code, delete: 0 },
    });
    if (exist) {
      throw new BusinessException(ErrorCode.USER_CODE_EXIST, '用户编号已存在');
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
    return true;
  }

  /**
   * 编辑用户
   */
  async updateUser(dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
    if (!user || user.delete !== 0) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.code === '88888888') {
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
    return true;
  }

  /**
   * 删除用户（软删除）
   */
  async deleteUser(dto: DeleteUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
    if (!user || user.delete !== 0) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    if (user.code === '88888888') {
      throw new BusinessException(
        ErrorCode.USER_CANNOT_DELETE_ADMIN,
        '超管用户不可删除',
      );
    }
    await this.prisma.user.update({
      where: { id: dto.id },
      data: { delete: 1 },
    });
    return true;
  }

  /**
   * 重置用户密码
   */
  async resetUserPassword(dto: ResetUserPasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.id } });
    if (!user || user.delete !== 0) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    const password = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: dto.id },
      data: { password },
    });
    return true;
  }
}
