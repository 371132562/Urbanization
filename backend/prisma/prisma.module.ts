// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // 关键装饰器，使模块全局可用
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // 导出服务以供其他模块使用
})
export class PrismaModule {}
