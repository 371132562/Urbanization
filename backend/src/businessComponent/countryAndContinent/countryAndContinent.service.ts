import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  ContinentListResDto,
  CountryListResDto,
  QueryContinentReqDto,
  QueryCountryReqDto,
} from '../../../types/dto';

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

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
}
