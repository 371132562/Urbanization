import { Module } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ThrottlerModule } from '@nestjs/throttler';
import { SystemLogsController } from './systemLogs.controller';
import { SystemLogsService } from './systemLogs.service';

@Module({
  imports: [
    // 为系统日志模块配置独立的限流策略
    ThrottlerModule.forRoot([
      {
        name: 'system-logs',
        ttl: 60000, // 1分钟时间窗口
        limit: 30, // 默认每分钟最多30次请求
      },
    ]),
  ],
  controllers: [SystemLogsController],
  providers: [SystemLogsService, PrismaService],
})
export class SystemLogsModule {}
