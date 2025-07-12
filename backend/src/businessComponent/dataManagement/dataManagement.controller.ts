import { Body, Controller, Post } from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import {
  CountryDetailReqDto,
  CountryDetailResDto,
  DataManagementListDto,
} from '../../../types/dto';

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

  /**
   * 获取特定国家特定年份的详细指标数据
   * @param params 请求参数，包含国家ID和年份
   * @returns {Promise<CountryDetailResDto>} 国家详细指标数据
   */
  @Post('detail')
  async detail(
    @Body() params: CountryDetailReqDto,
  ): Promise<CountryDetailResDto> {
    return this.dataManagementService.detail(params);
  }
}
