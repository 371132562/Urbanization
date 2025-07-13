import { Controller, Post, InternalServerErrorException } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { IndicatorHierarchyResDto } from '../../../types/dto';

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
}
