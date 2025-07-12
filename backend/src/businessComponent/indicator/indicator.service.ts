import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  DetailedIndicatorListResDto,
  QueryIndicatorReqDto,
  SecondaryIndicatorListResDto,
  TopIndicatorListResDto,
} from '../../../types/dto';

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

@Injectable()
export class IndicatorService {
  private readonly logger = new Logger(IndicatorService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有一级指标
   * @param params 查询参数，包含是否包含子指标
   * @returns {Promise<TopIndicatorListResDto>} 一级指标列表
   */
  async getTopIndicators(
    params: QueryIndicatorReqDto,
  ): Promise<TopIndicatorListResDto> {
    const { includeChildren = false } = params;
    this.logger.log(`获取一级指标，includeChildren=${includeChildren}`);

    try {
      // 根据是否包含子指标执行不同查询
      if (includeChildren) {
        // 包含子指标的查询
        return await this.prisma.topIndicator.findMany({
          include: {
            secondaryIndicator: {
              include: {
                detailedIndicator: true,
              },
            },
          },
        });
      } else {
        // 不包含子指标的查询
        return await this.prisma.topIndicator.findMany();
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`获取一级指标失败: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 获取所有二级指标
   * @param params 查询参数，包含是否包含子指标
   * @returns {Promise<SecondaryIndicatorListResDto>} 二级指标列表
   */
  async getSecondaryIndicators(
    params: QueryIndicatorReqDto,
  ): Promise<SecondaryIndicatorListResDto> {
    const { includeChildren = false } = params;
    this.logger.log(`获取二级指标，includeChildren=${includeChildren}`);

    try {
      // 根据是否包含子指标执行不同查询
      if (includeChildren) {
        // 包含子指标的查询
        return await this.prisma.secondaryIndicator.findMany({
          include: {
            detailedIndicator: true,
          },
        });
      } else {
        // 不包含子指标的查询
        return await this.prisma.secondaryIndicator.findMany();
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`获取二级指标失败: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 获取所有三级指标
   * @returns {Promise<DetailedIndicatorListResDto>} 三级指标列表
   */
  async getDetailedIndicators(): Promise<DetailedIndicatorListResDto> {
    this.logger.log('获取所有三级指标');

    try {
      // 查询所有三级指标
      return await this.prisma.detailedIndicator.findMany();
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`获取三级指标失败: ${err.message}`, err.stack);
      throw error;
    }
  }
}
