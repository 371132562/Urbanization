import { Injectable, Logger } from '@nestjs/common';
import { IndicatorHierarchyResDto, UpdateWeightsDto } from '../../../types/dto'; // 使用正确的路径

import { PrismaService } from '../../../prisma/prisma.service'; // 使用正确的路径
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';

type ErrorWithMessage = {
  message: string;
  stack?: string;
};

@Injectable()
export class IndicatorService {
  private readonly logger = new Logger(IndicatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有指标的层级结构（一级 -> 二级 -> 三级），并按创建时间升序排序
   * @returns {Promise<IndicatorHierarchyResDto>} 指标层级结构列表
   */
  async getIndicatorsHierarchy(): Promise<IndicatorHierarchyResDto> {
    this.logger.log('Fetching indicator hierarchy');

    try {
      const topIndicators = await this.prisma.topIndicator.findMany({
        where: { delete: 0 },
        orderBy: { createTime: 'asc' }, // Order by creation time
        include: {
          secondaryIndicator: {
            where: { delete: 0 },
            orderBy: { createTime: 'asc' }, // Order by creation time
            include: {
              detailedIndicator: {
                where: { delete: 0 },
                orderBy: { createTime: 'asc' }, // Order by creation time
              },
            },
          },
        },
      });

      if (!topIndicators || topIndicators.length === 0) {
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          '未找到任何指标层级数据',
        );
      }

      // Map Prisma result to the DTO
      const result: IndicatorHierarchyResDto = topIndicators.map((top) => ({
        id: top.id,
        cnName: top.indicatorCnName,
        enName: top.indicatorEnName,
        weight: Number(top.weight),
        secondaryIndicators: top.secondaryIndicator.map((secondary) => ({
          id: secondary.id,
          cnName: secondary.indicatorCnName,
          enName: secondary.indicatorEnName,
          weight: Number(secondary.weight),
          detailedIndicators: secondary.detailedIndicator.map((detailed) => ({
            id: detailed.id,
            cnName: detailed.indicatorCnName,
            enName: detailed.indicatorEnName,
            unit: detailed.unit,
            value: null,
            weight: Number(detailed.weight),
          })),
        })),
      }));

      return result;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Failed to fetch indicator hierarchy: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * 批量更新指标权重
   * @param {UpdateWeightsDto} params - 包含多个指标权重更新信息的参数
   * @returns {Promise<{ success: boolean }>} - 指示操作是否成功
   */
  async updateWeights(params: UpdateWeightsDto): Promise<{ success: boolean }> {
    const { weights } = params;
    this.logger.log(`准备批量更新 ${weights.length} 个指标的权重`);

    const updatePromises = weights.map((item) => {
      const { id, level, weight } = item;
      switch (level) {
        case 'top':
          return this.prisma.topIndicator.update({
            where: { id },
            data: { weight },
          });
        case 'secondary':
          return this.prisma.secondaryIndicator.update({
            where: { id },
            data: { weight },
          });
        case 'detailed':
          return this.prisma.detailedIndicator.update({
            where: { id },
            data: { weight },
          });
        default:
          // 过滤掉无效的层级，或者你也可以选择在这里抛出错误
          return null;
      }
    });

    try {
      // 使用事务一次性执行所有更新操作
      await this.prisma.$transaction(updatePromises.filter((p) => p !== null));
      this.logger.log(`成功批量更新 ${weights.length} 个指标的权重`);
      return { success: true };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`批量更新指标权重失败: ${err.message}`, err.stack);
      throw new BusinessException(ErrorCode.SYSTEM_ERROR, '批量更新权重失败');
    }
  }
}
