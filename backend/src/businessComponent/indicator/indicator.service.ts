import { Injectable, Logger } from '@nestjs/common';
import { IndicatorHierarchyResDto } from '../../../types/dto'; // 使用正确的路径

import { PrismaService } from '../../../prisma/prisma.service'; // 使用正确的路径

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

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
        orderBy: { createTime: 'asc' }, // Order by creation time
        include: {
          secondaryIndicator: {
            orderBy: { createTime: 'asc' }, // Order by creation time
            include: {
              detailedIndicator: {
                orderBy: { createTime: 'asc' }, // Order by creation time
              },
            },
          },
        },
      });

      // Map Prisma result to the DTO
      const result: IndicatorHierarchyResDto = topIndicators.map((top) => ({
        id: top.id,
        cnName: top.indicatorCnName,
        enName: top.indicatorEnName,
        secondaryIndicators: top.secondaryIndicator.map((secondary) => ({
          id: secondary.id,
          cnName: secondary.indicatorCnName,
          enName: secondary.indicatorEnName,
          detailedIndicators: secondary.detailedIndicator.map((detailed) => ({
            id: detailed.id,
            cnName: detailed.indicatorCnName,
            enName: detailed.indicatorEnName,
            unit: detailed.unit,
            value: null,
          })),
        })),
      }));

      return result;
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(
        `Failed to fetch indicator hierarchy: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }
}
