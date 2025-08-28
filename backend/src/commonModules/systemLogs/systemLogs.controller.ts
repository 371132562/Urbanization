import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

import {
  ReadLogReqDto,
  ReadUserLogReqDto,
  SystemLogFilesResDto,
  UserLogFilesReqDto,
  UserSearchResDto,
  LogLineItem,
} from '../../../types/dto';

import { SystemLogsService } from './systemLogs.service';

// 系统日志控制器：提供日志文件列表、读取、用户搜索等接口
@Controller('system/logs')
@UseGuards(ThrottlerGuard) // 启用限流守卫
export class SystemLogsController {
  constructor(private readonly service: SystemLogsService) {}

  // 列出系统日志文件（限流：每分钟最多30次）
  @Post('files')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listSystemFiles(): Promise<SystemLogFilesResDto> {
    return this.service.listSystemFiles();
  }

  // 列出用户日志文件（限流：每分钟最多30次）
  @Post('user/files')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async listUserFiles(
    @Body() dto: UserLogFilesReqDto,
  ): Promise<SystemLogFilesResDto> {
    return this.service.listUserFiles(dto);
  }

  // 读取系统日志内容（限流：每分钟最多20次，防止频繁读取大文件）
  @Post('read')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async readSystemLog(@Body() dto: ReadLogReqDto): Promise<LogLineItem[]> {
    return this.service.readSystemLog(dto);
  }

  // 读取用户日志内容（限流：每分钟最多20次，防止频繁读取大文件）
  @Post('user/read')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async readUserLog(@Body() dto: ReadUserLogReqDto): Promise<LogLineItem[]> {
    return this.service.readUserLog(dto);
  }

  // 搜索用户（限流：每分钟最多50次，搜索操作相对轻量）
  @Post('user/search')
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async searchUsers(): Promise<UserSearchResDto> {
    return this.service.searchUsers();
  }
}
