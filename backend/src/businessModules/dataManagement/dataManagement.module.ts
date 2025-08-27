import { Module } from '@nestjs/common';
import { DataManagementController } from './dataManagement.controller';
import { DataManagementService } from './dataManagement.service';

@Module({
  controllers: [DataManagementController],
  providers: [DataManagementService],
  exports: [DataManagementService],
})
export class DataManagementModule {}
