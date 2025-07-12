import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { IndicatorController } from './indicator.controller';
import { IndicatorService } from './indicator.service';

@Module({
  imports: [PrismaModule],
  controllers: [IndicatorController],
  providers: [IndicatorService],
  exports: [IndicatorService],
})
export class IndicatorModule {}
