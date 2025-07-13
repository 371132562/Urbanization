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
import * as dayjs from 'dayjs';

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
      // 统一处理年份，只保留年份信息
      const year = dayjs(iv.year).year();
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
        year: dayjs().year(year).startOf('year').toDate(), // 统一使用年初日期
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
          year: dayjs(values[0].year).startOf('year').toDate(), // 统一使用年初日期
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
    // 步骤1: 准备参数和基础数据
    const { countryId, year } = params;
    // 统一使用dayjs处理年份，只保留年份信息，忽略月日和具体时间
    const yearDate = dayjs(year).startOf('year').toDate();
    const yearValue = dayjs(yearDate).year();

    this.logger.log(
      `获取国家ID为 ${countryId} 在 ${yearValue} 年的详细指标数据`,
    );

    // 步骤2: 获取国家基本信息
    const country = await this.prisma.country.findUnique({
      where: { id: countryId },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new NotFoundException(`未找到ID为 ${countryId} 的国家`);
    }

    // 步骤3: 获取指定年份的指标数据

    // 获取该国家在指定年份的所有指标值
    const indicatorValues = await this.prisma.indicatorValue.findMany({
      where: {
        countryId,
        year: yearDate, // 直接使用精确匹配
      },
      include: { detailedIndicator: true },
    });

    // 获取所有三级指标定义(包括没有值的指标)
    const allDetailedIndicators = await this.prisma.detailedIndicator.findMany({
      include: {
        SecondaryIndicator: {
          include: { topIndicator: true },
        },
      },
    });

    // 步骤4: 构建指标数据结构
    // 4.1 创建指标值快速查找表
    const indicatorValuesMap = new Map<string, IndicatorValue>();
    indicatorValues.forEach((iv) => {
      indicatorValuesMap.set(iv.detailedIndicatorId, iv);
    });

    // 4.2 创建一级和二级指标容器
    const topIndicators = new Map<string, TopIndicatorItem>();
    const secondaryIndicators = new Map<string, SecondaryIndicatorItem>();

    // 4.3 处理所有指标，构建层级关系
    for (const indicator of allDetailedIndicators) {
      // 跳过没有二级指标关联的三级指标
      if (!indicator.SecondaryIndicator) continue;

      const secondaryIndicator = indicator.SecondaryIndicator;
      const topIndicator = secondaryIndicator.topIndicator;

      // 如果没有一级指标关联，跳过
      if (!topIndicator) continue;

      // 处理三级指标
      const indicatorValue = indicatorValuesMap.get(indicator.id);
      const detailedIndicator: DetailedIndicatorItem = {
        id: indicator.id,
        cnName: indicator.indicatorCnName,
        enName: indicator.indicatorEnName,
        unit: indicator.unit,
        value:
          indicatorValue && indicatorValue.value !== null
            ? indicatorValue.value.toNumber()
            : null,
      };

      // 处理二级指标
      if (!secondaryIndicators.has(secondaryIndicator.id)) {
        secondaryIndicators.set(secondaryIndicator.id, {
          id: secondaryIndicator.id,
          cnName: secondaryIndicator.indicatorCnName,
          enName: secondaryIndicator.indicatorEnName,
          detailedIndicators: [],
        });
      }

      // 将三级指标添加到二级指标中
      secondaryIndicators
        .get(secondaryIndicator.id)!
        .detailedIndicators.push(detailedIndicator);

      // 处理一级指标
      if (!topIndicators.has(topIndicator.id)) {
        topIndicators.set(topIndicator.id, {
          id: topIndicator.id,
          cnName: topIndicator.indicatorCnName,
          enName: topIndicator.indicatorEnName,
          secondaryIndicators: [],
        });
      }
    }

    // 步骤5: 将二级指标关联到一级指标
    // 5.1 预先建立二级指标到一级指标的映射关系
    const secondaryToTopMap = new Map<string, string>();
    allDetailedIndicators.forEach((di) => {
      if (di.SecondaryIndicator?.topIndicator) {
        secondaryToTopMap.set(
          di.SecondaryIndicator.id,
          di.SecondaryIndicator.topIndicator.id,
        );
      }
    });

    // 5.2 使用映射关系将二级指标添加到对应的一级指标中
    for (const [secondaryId, secondaryItem] of secondaryIndicators.entries()) {
      const topIndicatorId = secondaryToTopMap.get(secondaryId);
      if (topIndicatorId) {
        const topItem = topIndicators.get(topIndicatorId);
        if (topItem) {
          topItem.secondaryIndicators.push(secondaryItem);
        }
      }
    }

    // 步骤6: 检查数据完整性
    // 计算应有的指标总数和实际有值的指标数
    const totalIndicators = allDetailedIndicators.length;
    const validIndicators = indicatorValues.filter(
      (iv) => iv.value !== null,
    ).length;

    // 数据完整意味着所有指标都有值
    const isComplete = totalIndicators === validIndicators;

    // 步骤7: 构建最终返回结果
    const response: CountryDetailResDto = {
      countryId,
      cnName: country.cnName,
      enName: country.enName,
      year: yearDate,
      indicators: Array.from(topIndicators.values()),
      isComplete,
    };

    this.logger.log(
      `成功获取国家 ${country.cnName} 在 ${yearValue} 年的详细指标数据，` +
        `共 ${totalIndicators} 个三级指标，${response.indicators.length} 个一级指标`,
    );

    return response;
  }
}
