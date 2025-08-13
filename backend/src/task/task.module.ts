import { Module } from '@nestjs/common';
import { TaskService } from './task.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UploadModule } from 'src/upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule], // 导入 Prisma 和 Upload 模块
  providers: [TaskService],
})
export class TaskModule {}
