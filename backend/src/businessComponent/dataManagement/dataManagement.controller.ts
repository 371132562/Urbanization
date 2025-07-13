import { Body, Controller, Post } from '@nestjs/common';
import { DataManagementService } from './dataManagement.service';
import {
  CheckExistingDataDto,
  CheckExistingDataResDto,
  CountryDetailReqDto,
  CountryDetailResDto,
  CreateIndicatorValuesDto,
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
   * 创建或更新指标值数据
   * @param data 创建指标值的请求数据，包含国家ID、年份和指标值数组
   * @returns {Promise<{count: number}>} 创建或更新的指标值数量
   */
  @Post('create')
  async create(
    @Body() data: CreateIndicatorValuesDto,
  ): Promise<{ count: number }> {
    return this.dataManagementService.create(data);
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

  /**
   * 检查特定国家和年份是否已有指标数据
   * @param params 检查参数，包含国家ID和年份
   * @returns {Promise<CheckExistingDataResDto>} 是否存在数据及数据数量
   */
  @Post('checkExistingData')
  async checkExistingData(
    @Body() params: CheckExistingDataDto,
  ): Promise<CheckExistingDataResDto> {
    return this.dataManagementService.checkExistingData(params);
  }
}
