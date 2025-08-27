import { Module } from '@nestjs/common';
import { ScoreController } from './score.controller';
import { ScoreService } from './score.service';
import { PrismaModule } from 'prisma/prisma.module';
import { UploadModule } from '../../commonModules/upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ScoreController],
  providers: [ScoreService],
})
export class ScoreModule {}
