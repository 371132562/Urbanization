import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto,
  UrbanizationUpdateDto,
  UrbanizationWorldMapDataDto,
} from '../../../types/dto';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';

type ErrorWithMessage = {
  message: string;
  stack?: string;
};

@Injectable()
export class CountryAndContinentService {
  private readonly logger = new Logger(CountryAndContinentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有大洲
   * @param params 查询参数，包含是否包含国家
   * @returns {Promise<ContinentListResDto>} 大洲列表
   */
  async getContinents(
    params: QueryContinentReqDto,
  ): Promise<ContinentListResDto> {
    const { includeCountries = false } = params;
    this.logger.log(`获取大洲信息，includeCountries=${includeCountries}`);

    try {
      // 根据是否包含国家执行不同查询
      if (includeCountries) {
        // 包含国家的查询
        return await this.prisma.continent.findMany({
          where: { delete: 0 },
          include: {
            country: {
              where: {
                delete: 0,
              },
            },
          },
        });
      } else {
        // 不包含国家的查询
        return await this.prisma.continent.findMany({ where: { delete: 0 } });
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`获取大洲信息失败: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 获取所有国家
   * @param params 查询参数，包含是否包含大洲信息和可选的大洲ID
   * @returns {Promise<CountryListResDto>} 国家列表
   */
  async getCountries(params: QueryCountryReqDto): Promise<CountryListResDto> {
    const { includeContinent = false, continentId } = params;
    this.logger.log(
      `获取国家信息，includeContinent=${includeContinent}, continentId=${continentId || '所有'}`,
    );

    try {
      // 构建查询条件
      const where = continentId ? { continentId, delete: 0 } : { delete: 0 };

      // 根据是否包含大洲信息执行不同查询
      if (includeContinent) {
        // 包含大洲信息的查询
        return await this.prisma.country.findMany({
          where,
          include: {
            continent: true,
          },
        });
      } else {
        // 不包含大洲信息的查询
        return await this.prisma.country.findMany({
          where,
        });
      }
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`获取国家信息失败: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * 获取所有世界地图城镇化数据
   * @returns {Promise<UrbanizationWorldMapDataDto>} 世界地图城镇化数据列表
   */
  async getUrbanizationWorldMapData(): Promise<UrbanizationWorldMapDataDto> {
    this.logger.log('获取所有世界地图城镇化数据');

    try {
      const data = await this.prisma.urbanizationWorldMap.findMany({
        where: { delete: 0 },
        select: {
          id: true,
          countryId: true,
          urbanization: true,
          createTime: true,
          updateTime: true,
          country: {
            select: {
              cnName: true,
              enName: true,
              continent: {
                select: {
                  id: true,
                  cnName: true,
                  enName: true,
                },
              },
            },
          },
        },
      });

      if (!data || data.length === 0) {
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          '未找到世界地图城镇化数据',
        );
      }

      return data;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      const err = error as ErrorWithMessage;
      this.logger.error(
        `获取世界地图城镇化数据失败: ${err.message}`,
        err.stack,
      );
      throw error;
    }
  }

  /**
   * 批量更新国家城镇化状态
   * @param updates 更新数据数组
   * @returns {Promise<{count: number}>} 更新计数
   */
  async batchUpdateUrbanization(
    updates: UrbanizationUpdateDto[],
  ): Promise<{ count: number }> {
    this.logger.log(`开始批量更新 ${updates.length} 个国家的城镇化状态`);

    try {
      const updatePromises = updates.map((item) =>
        this.prisma.urbanizationWorldMap.updateMany({
          where: {
            countryId: item.countryId,
            delete: 0,
          },
          data: {
            urbanization: item.urbanization,
          },
        }),
      );

      const results = await this.prisma.$transaction(updatePromises);
      const totalAffected = results.reduce(
        (sum, result) => sum + result.count,
        0,
      );

      this.logger.log(`成功更新了 ${totalAffected} 条记录`);

      if (totalAffected !== updates.length) {
        this.logger.warn(
          `请求更新 ${updates.length} 个国家，但只找到了 ${totalAffected} 个匹配的记录`,
        );
      }

      return { count: totalAffected };
    } catch (error) {
      const err = error as ErrorWithMessage;
      this.logger.error(`批量更新城镇化状态失败: ${err.message}`, err.stack);
      // 在生产环境中，可能需要更具体的错误处理，而不是直接抛出原始错误
      throw new BusinessException(ErrorCode.SYSTEM_ERROR, '批量更新操作失败');
    }
  }
}
