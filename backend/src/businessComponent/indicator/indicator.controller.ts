import { Body, Controller, Post } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import {
  DetailedIndicatorListResDto,
  QueryIndicatorReqDto,
  SecondaryIndicatorListResDto,
  TopIndicatorListResDto,
} from '../../../types/dto';

@Controller('indicator')
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  /**
   * 获取所有一级指标
   * @param params 查询参数，包含是否包含子指标
   * @returns {Promise<TopIndicatorListResDto>} 一级指标列表
   */
  @Post('topIndicators')
  async getTopIndicators(
    @Body() params: QueryIndicatorReqDto,
  ): Promise<TopIndicatorListResDto> {
    return this.indicatorService.getTopIndicators(params);
  }

  /**
   * 获取所有二级指标
   * @param params 查询参数，包含是否包含子指标
   * @returns {Promise<SecondaryIndicatorListResDto>} 二级指标列表
   */
  @Post('secondaryIndicators')
  async getSecondaryIndicators(
    @Body() params: QueryIndicatorReqDto,
  ): Promise<SecondaryIndicatorListResDto> {
    return this.indicatorService.getSecondaryIndicators(params);
  }

  /**
   * 获取所有三级指标
   * @returns {Promise<DetailedIndicatorListResDto>} 三级指标列表
   */
  @Post('detailedIndicators')
  async getDetailedIndicators(): Promise<DetailedIndicatorListResDto> {
    return this.indicatorService.getDetailedIndicators();
  }
} 