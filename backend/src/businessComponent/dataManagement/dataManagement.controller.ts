import { Controller, Post } from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import { DataManagementListDto } from 'types/dto';

@Controller('dataManagement')
export class DataManagementController {
  constructor(private readonly dataManagementService: DataManagementService) {}

  /**
   * 获取所有数据管理条目
   * @returns {Promise<DataManagementListDto>}
   */
  @Post('list')
  async list(): Promise<DataManagementListDto> {
    return this.dataManagementService.list();
  }
}
