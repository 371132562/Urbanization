import { Body, Controller, Post } from '@nestjs/common';
import { UserService } from './user.service';
import {
  UserListResDto,
  CreateUserDto,
  UpdateUserDto,
  DeleteUserDto,
  ResetUserPasswordDto,
} from '../../../types/dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取用户列表
   */
  @Post('list')
  async getUserList(): Promise<UserListResDto> {
    return this.userService.getUserList();
  }

  /**
   * 创建用户
   */
  @Post('create')
  async createUser(@Body() dto: CreateUserDto) {
    return this.userService.createUser(dto);
  }

  /**
   * 编辑用户
   */
  @Post('update')
  async updateUser(@Body() dto: UpdateUserDto) {
    return this.userService.updateUser(dto);
  }

  /**
   * 删除用户
   */
  @Post('delete')
  async deleteUser(@Body() dto: DeleteUserDto) {
    return this.userService.deleteUser(dto);
  }

  /**
   * 重置用户密码
   */
  @Post('resetPassword')
  async resetUserPassword(@Body() dto: ResetUserPasswordDto) {
    return this.userService.resetUserPassword(dto);
  }
}
