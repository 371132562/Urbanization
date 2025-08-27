import { Controller, Post, Body } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { IndicatorHierarchyResDto, UpdateWeightsDto } from '../../../types/dto';

@Controller('indicator')
export class IndicatorController {
  constructor(private readonly indicatorService: IndicatorService) {}

  /**
   * 获取所有指标的层级结构（一级 -> 二级 -> 三级）
   * @returns {Promise<IndicatorHierarchyResDto>} 指标层级结构列表
   */
  @Post('indicatorsHierarchy')
  async getIndicatorsHierarchy(): Promise<IndicatorHierarchyResDto> {
    return this.indicatorService.getIndicatorsHierarchy();
  }

  /**
   * 批量更新指标权重
   * @param {UpdateWeightsDto} params - 包含多个指标权重更新信息的参数
   * @returns {Promise<{ success: boolean }>} - 指示操作是否成功
   */
  @Post('updateWeights')
  async updateWeights(
    @Body() params: UpdateWeightsDto,
  ): Promise<{ success: boolean }> {
    return this.indicatorService.updateWeights(params);
  }
}
