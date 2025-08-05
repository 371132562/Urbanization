import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto, UserProfileDto } from '../../types/dto';
import { CurrentUser, UserInfo } from './user.decorator';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * 用户登录
   * @param loginDto 登录信息
   * @returns 登录响应
   */
  @Public()
  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  /**
   * 获取当前用户信息
   * @param user 当前用户信息
   * @returns 用户信息
   */
  @Get('profile')
  async getProfile(@CurrentUser() user: UserInfo): Promise<UserProfileDto> {
    return await this.authService.getUserProfile(user.userId);
  }

  /**
   * 验证token有效性
   * @returns 验证结果
   */
  @Get('verify')
  verifyToken(): { valid: boolean } {
    return { valid: true };
  }
}
