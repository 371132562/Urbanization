import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  BatchCreateIndicatorValuesDto,
  BatchCheckIndicatorExistingDto,
  BatchCheckIndicatorExistingResDto,
  CheckExistingDataResDto,
  CountryData,
  CountryDetailReqDto,
  CountryDetailResDto,
  CreateIndicatorValuesDto,
  DataManagementListDto,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem,
  YearData,
  CountryYearQueryDto,
  ExportDataReqDto,
  ExportFormat,
  IndicatorDataItem,
} from '../../../types/dto';
import { IndicatorValue } from '@prisma/client';
import * as xlsx from 'xlsx';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import dayjs from '../../utils/dayjs';

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

    // 优化：使用Promise.all并行执行查询，减少数据库往返次数
    const [indicatorValues, allDetailedIndicators] = await Promise.all([
      // 优化查询：只选择必要的字段，减少数据传输量
      this.prisma.indicatorValue.findMany({
        where: {
          delete: 0,
          country: { delete: 0 },
          detailedIndicator: { delete: 0 }, // 确保三级指标也未删除
        },
        select: {
          year: true,
          value: true,
          detailedIndicatorId: true,
          country: {
            select: {
              id: true,
              cnName: true,
              enName: true,
              createTime: true,
              updateTime: true,
            },
          },
          detailedIndicator: {
            select: {
              id: true,
              indicatorCnName: true,
              indicatorEnName: true,
            },
          },
        },
        // 优化：在数据库层面进行排序，减少内存排序开销
        orderBy: [{ year: 'desc' }, { country: { updateTime: 'desc' } }],
      }),
      // 获取所有三级指标定义，用于填充缺失的数据
      this.prisma.detailedIndicator.findMany({
        where: { delete: 0 },
        select: {
          id: true,
          indicatorCnName: true,
          indicatorEnName: true,
        },
      }),
    ]);

    if (!indicatorValues || indicatorValues.length === 0) {
      this.logger.log('未找到任何指标数据，返回空数组。');
      return [];
    }

    // 优化：预构建指标映射表，避免重复查找
    const allIndicatorsMap = new Map(
      allDetailedIndicators.map((i) => [
        i.id,
        {
          cnName: i.indicatorCnName,
          enName: i.indicatorEnName,
        },
      ]),
    );

    // 优化：使用reduce进行高效数据分组，避免多层嵌套循环
    const groupedData = indicatorValues.reduce(
      (acc, iv) => {
        const year = iv.year;
        const countryId = iv.country.id;
        const countryKey = `${year}-${countryId}`;

        // 初始化年份分组
        if (!acc.yearGroups.has(year)) {
          acc.yearGroups.set(year, new Set<string>());
        }
        acc.yearGroups.get(year)!.add(countryId);

        // 分组指标值数据
        if (!acc.countryData.has(countryKey)) {
          acc.countryData.set(countryKey, {
            country: iv.country,
            year,
            indicators: new Map<string, number | null>(),
          });
        }

        // 优化：直接处理数值转换，避免重复转换
        const processedValue =
          iv.value !== null
            ? typeof iv.value === 'string'
              ? Number(iv.value)
              : iv.value.toNumber()
            : null;

        acc.countryData
          .get(countryKey)!
          .indicators.set(iv.detailedIndicatorId, processedValue);

        return acc;
      },
      {
        yearGroups: new Map<number, Set<string>>(),
        countryData: new Map<
          string,
          {
            country: (typeof indicatorValues)[0]['country'];
            year: number;
            indicators: Map<string, number | null>;
          }
        >(),
      },
    );

    // 优化：构建结果数组，减少重复操作
    const result: DataManagementListDto = Array.from(
      groupedData.yearGroups.entries(),
    )
      .map(([year, countryIds]) => {
        const yearData: YearData = {
          year,
          data: Array.from(countryIds)
            .map((countryId) => {
              const countryKey = `${year}-${countryId}`;
              const countryInfo = groupedData.countryData.get(countryKey)!;
              const { country, indicators: indicatorMap } = countryInfo;

              // 优化：使用Array.from和map构建指标列表，提高性能
              const indicators: IndicatorDataItem[] = Array.from(
                allIndicatorsMap.entries(),
              ).map(([id, indicatorInfo]) => ({
                id,
                cnName: indicatorInfo.cnName,
                enName: indicatorInfo.enName,
                value: indicatorMap.get(id) ?? null,
              }));

              // 优化：使用every方法检查完整性，更简洁高效
              const isComplete = indicators.every(
                (indicator) => indicator.value !== null,
              );

              return {
                id: countryId,
                cnName: country.cnName,
                enName: country.enName,
                year,
                isComplete,
                indicators,
                createTime: country.createTime,
                updateTime: country.updateTime,
              } as CountryData;
            })
            // 优化：由于数据库已排序，这里只需要保持顺序即可
            .sort((a, b) => b.updateTime.getTime() - a.updateTime.getTime()),
        };
        return yearData;
      })
      // 优化：由于数据库已按年份降序排序，这里可以简化
      .sort((a, b) => b.year - a.year);

    this.logger.log('指标数据处理完成并按年份排序。');
    return result;
  }

  /**
   * 创建或更新指标值数据
   * @param data 创建指标值的请求数据
   * @returns 创建或更新的指标值数量
   */
  async create(data: CreateIndicatorValuesDto): Promise<{ count: number }> {
    // 步骤1: 准备参数和基础数据
    const { countryId, year, indicators } = data;
    // 直接使用数字年份
    const yearValue = year;

    this.logger.log(
      `准备为国家ID ${countryId} 在 ${yearValue} 年创建/更新 ${indicators.length} 个指标值`,
    );

    // 步骤2: 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到ID为 ${countryId} 的国家`,
      );
    }

    // 步骤3: 检查该国家该年份是否已有数据
    const existingCount = await this.prisma.indicatorValue.count({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
    });

    // 步骤4: 处理指标值数据，将空值转换为null
    const processedData = indicators.map((indicator) => {
      const { detailedIndicatorId, value } = indicator;

      // 处理空值：undefined、null、空字符串或NaN都转为null
      let processedValue: number | null = null;

      if (value !== undefined && value !== null) {
        if (typeof value === 'number') {
          processedValue = isNaN(value) ? null : value;
        } else if (typeof value === 'string') {
          if (value !== '') {
            const numValue = Number(value);
            processedValue = isNaN(numValue) ? null : numValue;
          }
        }
      }

      return {
        detailedIndicatorId,
        countryId,
        year: yearValue,
        value: processedValue,
        createTime: new Date(),
        updateTime: new Date(),
      };
    });

    // 步骤5: 执行数据库操作
    const result = await this.prisma.$transaction(async (prisma) => {
      let count = 0;

      // 如果已存在数据，先进行物理删除
      if (existingCount > 0) {
        await prisma.indicatorValue.deleteMany({
          where: {
            countryId,
            year: yearValue,
          },
        });

        this.logger.log(
          `已删除国家 ${country.cnName} 在 ${yearValue} 年的 ${existingCount} 条现有数据`,
        );
      }

      // 批量创建新数据
      if (processedData.length > 0) {
        const result = await prisma.indicatorValue.createMany({
          data: processedData,
        });
        count = result.count;
      }

      return { count };
    });

    this.logger.log(
      `成功为国家 ${country.cnName} 在 ${yearValue} 年创建了 ${result.count} 个指标值数据`,
    );

    return { count: result.count };
  }

  /**
   * 批量创建或更新多个国家的指标值数据
   * @param data 批量创建指标值的请求数据
   * @returns 批量创建的结果统计
   */
  async batchCreate(data: BatchCreateIndicatorValuesDto): Promise<{
    totalCount: number;
    successCount: number;
    failCount: number;
    failedCountries: string[];
  }> {
    const { year, countries } = data;
    // 直接使用数字年份
    const yearValue = year;

    // 验证请求数据大小，防止过大的请求导致性能问题
    if (countries.length > 500) {
      this.logger.warn(
        `批量导入数据量过大: ${countries.length} 个国家，建议分批处理`,
      );
      throw new BusinessException(
        ErrorCode.INVALID_INPUT,
        `批量导入数据量过大，最多支持500个国家，当前为${countries.length}个。建议分批处理或减少数据量。`,
      );
    }

    this.logger.log(
      `准备批量创建 ${countries.length} 个国家在 ${yearValue} 年的指标值数据`,
    );

    // 步骤1: 验证所有国家是否存在
    const countryIds = countries.map((c) => c.countryId);
    const existingCountries = await this.prisma.country.findMany({
      where: {
        id: { in: countryIds },
        delete: 0,
      },
    });

    const existingCountryIds = new Set(existingCountries.map((c) => c.id));
    const invalidCountryIds = countryIds.filter(
      (id) => !existingCountryIds.has(id),
    );

    if (invalidCountryIds.length > 0) {
      this.logger.error(`未找到以下国家ID: ${invalidCountryIds.join(', ')}`);
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
      );
    }

    // 步骤2: 检查哪些国家该年份已有数据
    const existingData = await this.prisma.indicatorValue.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearValue,
        delete: 0,
      },
      select: {
        countryId: true,
      },
    });

    const existingCountryIdsSet = new Set(existingData.map((d) => d.countryId));

    // 步骤3: 处理所有国家的指标值数据
    const allProcessedData: {
      detailedIndicatorId: string;
      countryId: string;
      year: number;
      value: number | null;
      createTime: Date;
      updateTime: Date;
    }[] = [];

    for (const countryData of countries) {
      const { countryId, indicators } = countryData;

      // 处理指标值数据，将空值转换为null
      const processedData = indicators.map((indicator) => {
        const { detailedIndicatorId, value } = indicator;

        // 处理空值：undefined、null、空字符串或NaN都转为null
        let processedValue: number | null = null;

        if (value !== undefined && value !== null) {
          if (typeof value === 'number') {
            processedValue = isNaN(value) ? null : value;
          } else if (typeof value === 'string') {
            if (value !== '') {
              const numValue = Number(value);
              processedValue = isNaN(numValue) ? null : numValue;
            }
          }
        }

        return {
          detailedIndicatorId,
          countryId,
          year: yearValue,
          value: processedValue,
          createTime: new Date(),
          updateTime: new Date(),
        };
      });

      allProcessedData.push(...processedData);
    }

    // 步骤4: 执行批量数据库操作
    const result = await this.prisma.$transaction(async (prisma) => {
      let totalCount = 0;

      // 如果已有数据，先进行物理删除
      if (existingCountryIdsSet.size > 0) {
        const deleteResult = await prisma.indicatorValue.deleteMany({
          where: {
            countryId: { in: Array.from(existingCountryIdsSet) },
            year: yearValue,
          },
        });

        this.logger.log(
          `已删除 ${existingCountryIdsSet.size} 个国家在 ${yearValue} 年的 ${deleteResult.count} 条现有数据`,
        );
      }

      // 批量创建新数据
      if (allProcessedData.length > 0) {
        const createResult = await prisma.indicatorValue.createMany({
          data: allProcessedData,
        });
        totalCount = createResult.count;
      }

      return { totalCount };
    });

    this.logger.log(
      `成功批量创建了 ${countries.length} 个国家在 ${yearValue} 年的 ${result.totalCount} 个指标值数据`,
    );

    return {
      totalCount: result.totalCount,
      successCount: countries.length,
      failCount: 0,
      failedCountries: [],
    };
  }

  /**
   * 获取特定国家特定年份的详细指标数据
   * @param params 请求参数，包含国家ID和年份
   * @returns 国家详细指标数据，包括所有三级指标及其层级关系
   */
  async detail(params: CountryDetailReqDto): Promise<CountryDetailResDto> {
    // 步骤1: 准备参数和基础数据
    const { countryId, year } = params;
    // 直接使用数字年份
    const yearValue = year;

    this.logger.log(
      `获取国家ID为 ${countryId} 在 ${yearValue} 年的详细指标数据`,
    );

    // 步骤2: 获取国家基本信息
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到ID为 ${countryId} 的国家`,
      );
    }

    // 步骤3: 获取指定年份的指标数据

    // 获取该国家在指定年份的所有指标值
    // 使用精确匹配查询，因为现在 year 是 number 类型
    const indicatorValues = await this.prisma.indicatorValue.findMany({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
        detailedIndicator: {
          delete: 0,
        },
      },
      include: { detailedIndicator: true },
    });

    if (!indicatorValues || indicatorValues.length === 0) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到国家 ${country.cnName} 在 ${yearValue} 年的指标数据`,
      );
    }

    // 获取所有三级指标定义(包括没有值的指标)
    const allDetailedIndicators = await this.prisma.detailedIndicator.findMany({
      where: {
        delete: 0,
        SecondaryIndicator: {
          delete: 0,
          topIndicator: {
            delete: 0,
          },
        },
      },
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
            ? typeof indicatorValue.value === 'string'
              ? Number(indicatorValue.value)
              : indicatorValue.value.toNumber()
            : null,
        weight: Number(indicator.weight), // 修复：Decimal转number
      };

      // 处理二级指标
      if (!secondaryIndicators.has(secondaryIndicator.id)) {
        secondaryIndicators.set(secondaryIndicator.id, {
          id: secondaryIndicator.id,
          cnName: secondaryIndicator.indicatorCnName,
          enName: secondaryIndicator.indicatorEnName,
          detailedIndicators: [],
          weight: Number(secondaryIndicator.weight), // 修复：Decimal转number
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
          weight: Number(topIndicator.weight), // 修复：Decimal转number
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

    // 步骤7: 构建并返回响应数据
    return {
      countryId: country.id,
      year: yearValue,
      indicators:
        topIndicators.size > 0 ? Array.from(topIndicators.values()) : [],
      isComplete,
    };
  }

  /**
   * 根据国家和年份删除所有相关指标数据
   * @param params 包含国家ID和年份的请求参数
   * @returns 删除的记录数
   */
  async delete(params: CountryYearQueryDto): Promise<{ count: number }> {
    const { countryId, year } = params;
    const yearValue = year;

    this.logger.log(
      `准备删除国家ID ${countryId} 在 ${yearValue} 年的所有指标数据`,
    );

    // 步骤1: 检查数据是否存在
    const existingCount = await this.prisma.indicatorValue.count({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
    });

    if (existingCount === 0) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到国家ID ${countryId} 在 ${yearValue} 年的数据，无需删除`,
      );
    }

    // 步骤2: 执行软删除
    const { count } = await this.prisma.indicatorValue.updateMany({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
      data: {
        delete: 1,
      },
    });

    this.logger.log(
      `成功软删除了国家ID ${countryId} 在 ${yearValue} 年的 ${count} 条指标数据`,
    );

    return { count };
  }

  /**
   * 检查特定国家和年份是否已有指标数据
   * @param params 检查参数，包含国家ID和年份
   * @returns 是否存在数据及数据数量
   */
  async checkExistingData(
    params: CountryYearQueryDto,
  ): Promise<CheckExistingDataResDto> {
    const { countryId, year } = params;
    // 直接使用数字年份
    const yearValue = year;

    this.logger.log(
      `检查国家ID ${countryId} 在 ${yearValue} 年是否已有指标数据`,
    );

    // 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到ID为 ${countryId} 的国家`,
      );
    }

    // 查询该国家该年份的指标值数量
    // 使用精确匹配查询，因为现在 year 是 number 类型
    const count = await this.prisma.indicatorValue.count({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
    });

    const exists = count > 0;

    this.logger.log(
      `国家 ${country.cnName} 在 ${yearValue} 年${
        exists ? `已有 ${count} 条` : '没有'
      }指标数据`,
    );

    return {
      exists,
      count,
    };
  }

  /**
   * 批量检查多个国家和年份的指标数据是否存在
   * @param data 批量检查参数，包含年份和国家ID数组
   * @returns 批量检查结果，包含已存在和不存在的国家列表
   */
  async batchCheckExistingData(
    data: BatchCheckIndicatorExistingDto,
  ): Promise<BatchCheckIndicatorExistingResDto> {
    const { year, countryIds } = data;
    // 直接使用数字年份
    const yearValue = year;

    this.logger.log(
      `准备批量检查 ${countryIds.length} 个国家在 ${yearValue} 年的指标数据是否存在`,
    );

    // 步骤1: 验证所有国家是否存在
    const existingCountries = await this.prisma.country.findMany({
      where: {
        id: { in: countryIds },
        delete: 0,
      },
    });

    const existingCountryIds = new Set(existingCountries.map((c) => c.id));
    const invalidCountryIds = countryIds.filter(
      (id) => !existingCountryIds.has(id),
    );

    if (invalidCountryIds.length > 0) {
      this.logger.error(`未找到以下国家ID: ${invalidCountryIds.join(', ')}`);
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
      );
    }

    // 步骤2: 批量查询已存在的指标数据
    // 使用精确匹配查询，因为现在 year 是 number 类型
    const existingData = await this.prisma.indicatorValue.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearValue,
        delete: 0,
      },
      select: {
        countryId: true,
      },
    });

    const existingDataCountryIds = new Set(
      existingData.map((d) => d.countryId),
    );
    const nonExistingCountryIds = countryIds.filter(
      (id) => !existingDataCountryIds.has(id),
    );

    this.logger.log(
      `批量检查完成: ${countryIds.length} 个国家中，${existingDataCountryIds.size} 个已有指标数据，${nonExistingCountryIds.length} 个没有指标数据`,
    );

    return {
      totalCount: countryIds.length,
      existingCount: existingDataCountryIds.size,
      existingCountries: Array.from(existingDataCountryIds),
      nonExistingCountries: nonExistingCountryIds,
    };
  }

  /**
   * 导出特定年份和多个国家的数据
   * @param params 导出参数，包含年份、国家ID数组和格式
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   */
  async exportData(
    params: ExportDataReqDto,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    const { year, countryIds, format } = params;
    const yearValue = year;

    this.logger.log(
      `开始导出 ${yearValue} 年 ${countryIds.length} 个国家的数据，格式为 ${format}`,
    );

    // 步骤1: 获取所有三级指标定义作为表头
    const indicators = await this.prisma.detailedIndicator.findMany({
      where: { delete: 0 },
      orderBy: { createTime: 'asc' }, // 保证每次导出的指标顺序一致
    });
    this.logger.log(`成功获取 ${indicators.length} 个三级指标作为表头`);

    // 步骤2: 获取所有请求的国家信息
    const countries = await this.prisma.country.findMany({
      where: {
        id: { in: countryIds },
        delete: 0,
      },
    });
    // 创建国家ID到国家实体的映射，方便快速查找中文名
    const countryMap = new Map(countries.map((c) => [c.id, c]));
    this.logger.log(`成功获取 ${countries.length} 个请求的国家信息`);

    // 步骤3: 一次性获取所有相关指标值
    // 使用精确匹配查询，因为现在 year 是 number 类型
    this.logger.log(
      `查询条件: countryIds=${JSON.stringify(countryIds)}, year=${yearValue}`,
    );

    const values = await this.prisma.indicatorValue.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearValue,
        delete: 0,
      },
    });
    this.logger.log(`查询到 ${values.length} 条相关指标值`);

    // 步骤4: 将指标值处理成快速查找的嵌套Map: Map<countryId, Map<indicatorId, value>>
    const valuesMap = new Map<string, Map<string, number>>();
    for (const value of values) {
      if (!valuesMap.has(value.countryId)) {
        valuesMap.set(value.countryId, new Map());
      }
      if (value.value !== null) {
        // 兼容 SQLite 下 Decimal 实际为字符串的情况，统一转为 number
        const numValue =
          typeof value.value === 'string'
            ? Number(value.value)
            : value.value.toNumber();
        valuesMap
          .get(value.countryId)!
          .set(value.detailedIndicatorId, numValue);
      }
    }

    // 步骤5: 构建表头行
    const header = ['国家'];
    for (const indicator of indicators) {
      const unit = indicator.unit ? `(${indicator.unit})` : '';
      header.push(`${indicator.indicatorCnName}${unit}`);
    }

    // 步骤6: 构建数据行
    const dataRows: (string | number | null)[][] = [];
    for (const countryId of countryIds) {
      const country = countryMap.get(countryId);
      if (!country) continue; // 如果某个ID无效，则跳过

      const row: (string | number | null)[] = [country.cnName];
      const countryValues =
        valuesMap.get(countryId) || new Map<string, number>();

      for (const indicator of indicators) {
        const value = countryValues.get(indicator.id);
        // 如果找不到值，则用null填充
        row.push(value !== undefined ? value : null);
      }
      dataRows.push(row);
    }
    this.logger.log(`成功构建 ${dataRows.length} 行导出数据`);

    // 步骤7: 调用辅助方法生成文件
    const { buffer, mime, fileName } = this._generateFileBuffer(
      header,
      dataRows,
      format,
      yearValue,
    );

    this.logger.log(`成功生成 ${fileName}`);
    return { buffer, mime, fileName };
  }

  /**
   * 根据数据、格式和年份生成文件Buffer (私有辅助方法)
   * @param header 表头数组
   * @param dataRows 数据行数组
   * @param format 文件格式
   * @param year 年份
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   * @private
   */
  private _generateFileBuffer(
    header: string[],
    dataRows: (string | number | null)[][],
    format: ExportFormat,
    year: number,
  ): { buffer: Buffer; mime: string; fileName: string } {
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');
    const fileName = `${year}_城镇化指标数据_${timestamp}.${format}`;
    let buffer: Buffer;
    let mime: string;

    if (format === ExportFormat.JSON) {
      // 对于JSON，将其转换为对象数组以便阅读
      const jsonData: { [key: string]: string | number | null }[] =
        dataRows.map(
          (
            row: (string | number | null)[],
          ): { [key: string]: string | number | null } => {
            const obj: { [key: string]: string | number | null } = {};
            header.forEach((h: string, i: number) => {
              obj[h] = row[i];
            });
            return obj;
          },
        );
      buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
      mime = 'application/json';
    } else {
      // 对于xlsx和csv，使用aoa_to_sheet
      const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
      if (format === ExportFormat.CSV) {
        const csvOutput = xlsx.utils.sheet_to_csv(worksheet);
        // buffer = Buffer.from(csvOutput, 'utf8');
        // 添加BOM以防止Excel打开CSV时中文乱码
        const bom = Buffer.from([0xef, 0xbb, 0xbf]);
        buffer = Buffer.concat([bom, Buffer.from(csvOutput)]);
        mime = 'text/csv;charset=utf-8;';
      } else {
        // xlsx
        const workbook = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(workbook, worksheet, 'Data');
        buffer = xlsx.write(workbook, {
          type: 'buffer',
          bookType: 'xlsx',
        }) as Buffer;
        mime =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }
    }

    return { buffer, mime, fileName };
  }
}
