import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CountryData,
  CountryDetailReqDto,
  CountryDetailResDto,
  DataManagementListDto,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem,
  YearData,
} from '../../../types/dto';
import { IndicatorValue, Country } from '@prisma/client';

@Injectable()
export class DataManagementService {
  private readonly logger = new Logger(DataManagementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 查询所有指标数据，并按年份和国家进行分组
   * @returns 按年份分组的国家指标数据
   */
  async list(): Promise<DataManagementListDto> {
    this.logger.log('从数据库获取所有指标数据。');
    // 从数据库查询所有指标值，并包含关联的国家信息
    const indicatorValues = await this.prisma.indicatorValue.findMany({
      include: {
        country: true,
      },
    });

    // 定义一个包含国家信息的指标值类型，方便后续处理
    type IndicatorValueWithCountry = IndicatorValue & { country: Country };

    // 使用 Map 按年份和国家/地区 ID 对数据进行分组
    // 外部 Map 的键是年份，内部 Map 的键是国家 ID
    const groupedByCountryYear = new Map<
      number,
      Map<string, IndicatorValueWithCountry[]>
    >();

    // 遍历所有指标值，进行分组
    for (const iv of indicatorValues) {
      const year = iv.year.getFullYear();
      const countryId = iv.country.id;

      // 如果年份不存在，则在 Map 中创建一个新的条目
      if (!groupedByCountryYear.has(year)) {
        groupedByCountryYear.set(
          year,
          new Map<string, IndicatorValueWithCountry[]>(),
        );
      }
      const countryMap = groupedByCountryYear.get(year)!;
      // 如果国家/地区 ID 不存在，则在内部 Map 中创建一个新的条目
      if (!countryMap.has(countryId)) {
        countryMap.set(countryId, []);
      }
      // 将当前指标值添加到对应的分组中
      countryMap.get(countryId)!.push(iv);
    }

    // 将分组后的 Map 转换为 DTO 所需的数组形式
    const result: DataManagementListDto = [];
    for (const [year, countryMap] of groupedByCountryYear.entries()) {
      const yearData: YearData = {
        year: new Date(year, 0, 1), // 转换为 Date 类型，表示该年的1月1日
        data: [],
      };
      // 遍历每个国家/地区的数据
      for (const [, values] of countryMap.entries()) {
        if (values.length === 0) continue;

        // 获取国家/地区的中文和英文名称
        const { id, cnName, enName, createTime, updateTime } =
          values[0].country;

        // 检查数据是否完整（即是否存在 null 值）
        const isComplete = !values.some((v) => v.value === null);

        const countryData: CountryData = {
          id,
          cnName,
          enName,
          year: values[0].year, // 使用原始的年份数据
          isComplete,
          createTime: createTime,
          updateTime: updateTime,
        };
        yearData.data.push(countryData);
      }
      result.push(yearData);
    }

    // 按年份升序排序，使用 getTime() 进行比较
    this.logger.log('指标数据处理完成并按年份排序。');
    return result.sort((a, b) => a.year.getTime() - b.year.getTime());
  }

  /**
   * 获取特定国家特定年份的详细指标数据
   * @param params 请求参数，包含国家ID和年份
   * @returns 国家详细指标数据，包括所有三级指标及其层级关系
   */
  async detail(params: CountryDetailReqDto): Promise<CountryDetailResDto> {
    const { countryId, year } = params;
    // 确保 year 是 Date 类型
    const yearDate = year instanceof Date ? year : new Date(year);
    const yearValue = yearDate.getFullYear();

    this.logger.log(
      `获取国家ID为 ${countryId} 在 ${yearValue} 年的详细指标数据`,
    );

    // 查询国家信息
    const country = await this.prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new NotFoundException(`未找到ID为 ${countryId} 的国家`);
    }

    // 获取年份的起始和结束时间
    const startDate = new Date(yearValue, 0, 1);
    const endDate = new Date(yearValue, 11, 31);

    // 查询该国家在指定年份的所有指标值
    const indicatorValues = await this.prisma.indicatorValue.findMany({
      where: {
        countryId,
        year: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        detailedIndicator: true,
      },
    });

    // 查询所有三级指标，以确保返回完整的69个指标（包括没有值的指标）
    const allDetailedIndicators = await this.prisma.detailedIndicator.findMany({
      include: {
        SecondaryIndicator: {
          include: {
            topIndicator: true,
          },
        },
      },
    });

    // 将所有指标值转换为 DetailedIndicatorItem 格式
    const detailedIndicatorMap = new Map<string, DetailedIndicatorItem>();

    // 首先处理有实际值的指标
    for (const iv of indicatorValues) {
      const detailedIndicator = iv.detailedIndicator;

      detailedIndicatorMap.set(detailedIndicator.id, {
        id: detailedIndicator.id,
        cnName: detailedIndicator.indicatorCnName,
        enName: detailedIndicator.indicatorEnName,
        unit: detailedIndicator.unit,
        value: iv.value !== null ? iv.value.toNumber() : null,
      });
    }

    // 然后处理所有三级指标，确保即使没有值的指标也会被包含
    for (const indicator of allDetailedIndicators) {
      // 如果该指标已经在 Map 中存在（说明它有实际值），就跳过它
      if (detailedIndicatorMap.has(indicator.id)) continue;

      detailedIndicatorMap.set(indicator.id, {
        id: indicator.id,
        cnName: indicator.indicatorCnName,
        enName: indicator.indicatorEnName,
        unit: indicator.unit,
        value: null, // 默认为 null，因为这个指标没有实际值
      });
    }

    // 构建层次结构
    // 1. 创建一级指标 Map
    const topIndicatorMap = new Map<string, TopIndicatorItem>();
    // 2. 创建二级指标 Map
    const secondaryIndicatorMap = new Map<string, SecondaryIndicatorItem>();

    // 遍历所有三级指标，构建层次结构
    for (const indicator of allDetailedIndicators) {
      if (!indicator.SecondaryIndicator) continue;

      const detailedIndicator = detailedIndicatorMap.get(indicator.id);
      if (!detailedIndicator) continue;

      const secondaryIndicator = indicator.SecondaryIndicator;
      const topIndicator = secondaryIndicator.topIndicator;

      // 处理二级指标
      if (!secondaryIndicatorMap.has(secondaryIndicator.id)) {
        secondaryIndicatorMap.set(secondaryIndicator.id, {
          id: secondaryIndicator.id,
          cnName: secondaryIndicator.indicatorCnName,
          enName: secondaryIndicator.indicatorEnName,
          detailedIndicators: [],
        });
      }
      secondaryIndicatorMap
        .get(secondaryIndicator.id)
        ?.detailedIndicators.push(detailedIndicator);

      // 处理一级指标
      if (!topIndicatorMap.has(topIndicator.id)) {
        topIndicatorMap.set(topIndicator.id, {
          id: topIndicator.id,
          cnName: topIndicator.indicatorCnName,
          enName: topIndicator.indicatorEnName,
          secondaryIndicators: [],
        });
      }
    }

    // 将二级指标添加到对应的一级指标中
    for (const [
      secondaryId,
      secondaryItem,
    ] of secondaryIndicatorMap.entries()) {
      const secondaryIndicator = allDetailedIndicators.find(
        (di) =>
          di.SecondaryIndicator && di.SecondaryIndicator.id === secondaryId,
      )?.SecondaryIndicator;

      if (secondaryIndicator && secondaryIndicator.topIndicator) {
        const topIndicatorId = secondaryIndicator.topIndicator.id;
        const topIndicator = topIndicatorMap.get(topIndicatorId);
        if (topIndicator) {
          topIndicator.secondaryIndicators.push(secondaryItem);
        }
      }
    }

    // 检查数据是否完整（是否所有指标都有值）
    const isComplete = Array.from(detailedIndicatorMap.values()).every(
      (item) => item.value !== null,
    );

    // 构建响应对象
    const response: CountryDetailResDto = {
      countryId,
      cnName: country.cnName,
      enName: country.enName,
      year: yearDate, // 使用转换后的 yearDate
      indicators: Array.from(topIndicatorMap.values()),
      isComplete,
    };

    this.logger.log(
      `成功获取国家 ${country.cnName} 在 ${yearValue} 年的详细指标数据，共 ${Array.from(detailedIndicatorMap.values()).length} 个三级指标，${response.indicators.length} 个一级指标`,
    );
    return response;
  }
}
