import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CountryData,
  DataManagementListDto,
  IndicatorValue,
  YearData,
} from '../../../types/dto';

@Injectable()
export class DataManagementService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查询所有指标数据，并按年份和国家进行分组
   * @returns 按年份分组的国家指标数据
   */
  async list(): Promise<DataManagementListDto> {
    const indicatorValues = await this.prisma.indicatorValue.findMany({
      include: {
        country: true,
        detailedIndicator: true,
      },
    });

    // 使用 Map 按年份和国家/地区 ID 对数据进行分组
    const yearDataMap = new Map<number, Map<string, CountryData>>();

    for (const iv of indicatorValues) {
      const year = iv.year.getFullYear();
      const countryId = iv.country.id;

      let countryMap = yearDataMap.get(year);
      if (!countryMap) {
        countryMap = new Map<string, CountryData>();
        yearDataMap.set(year, countryMap);
      }

      let countryData = countryMap.get(countryId);
      if (!countryData) {
        countryData = {
          cnName: iv.country.cnName,
          enName: iv.country.enName,
          values: [],
        };
        countryMap.set(countryId, countryData);
      }

      const indicatorValue: IndicatorValue = {
        cnName: iv.detailedIndicator.indicatorCnName,
        enName: iv.detailedIndicator.indicatorEnName,
        value: iv.value !== null ? iv.value.toNumber() : null,
      };

      countryData.values.push(indicatorValue);
    }

    // 将 Map 转换为数组形式
    const result: DataManagementListDto = [];
    for (const [year, countryMap] of yearDataMap.entries()) {
      const yearData: YearData = {
        year,
        data: Array.from(countryMap.values()),
      };
      result.push(yearData);
    }

    // 按年份升序排序
    return result.sort((a, b) => a.year - b.year);
  }
}
