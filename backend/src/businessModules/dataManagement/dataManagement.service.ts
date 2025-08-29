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
  PaginatedYearData,
  PaginationInfo,
  DetailedIndicatorItem,
  SecondaryIndicatorItem,
  TopIndicatorItem,
  CountryYearQueryDto,
  ExportDataMultiYearReqDto,
  ExportFormat,
  DataManagementYearsResDto,
  SimpleCountryData,
  DataManagementListByYearReqDto,
  DataManagementListByYearResDto,
} from '../../../types/dto';
import { IndicatorValue } from '@prisma/client';
import * as xlsx from 'xlsx';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import dayjs from '../../utils/date-time.utils';

@Injectable()
export class DataManagementService {
  private readonly logger = new Logger(DataManagementService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 获取指定年份的分页数据（单年份）
   */
  async listByYear(
    params: DataManagementListByYearReqDto,
  ): Promise<DataManagementListByYearResDto> {
    const {
      year,
      page = 1,
      pageSize = 10,
      searchTerm,
      sortField,
      sortOrder,
    } = params;

    this.logger.log(
      `[开始] 获取年份数据 - 年份: ${year}, 页码: ${page}, 每页大小: ${pageSize}, 搜索: ${searchTerm || '无'}, 排序: ${sortField || '无'}`,
    );

    try {
      // 计算分页
      const skip = (page - 1) * pageSize;

      // where 条件
      const whereCondition = {
        year,
        delete: 0,
        country: {
          delete: 0,
          ...(searchTerm && {
            OR: [
              { cnName: { contains: searchTerm } },
              { enName: { contains: searchTerm } },
            ],
          }),
        },
        detailedIndicator: { delete: 0 },
      } as const;

      // 总数
      const countryGroups = await this.prisma.indicatorValue.findMany({
        where: whereCondition,
        select: { countryId: true },
        distinct: ['countryId'],
      });
      const totalCount = countryGroups.length;

      this.logger.log(
        `[统计] 获取年份数据 - 年份 ${year} 共有 ${totalCount} 个国家`,
      );

      // 计算国家ID列表（排序/默认）
      let countryIdList: string[] = [];
      if (sortField && sortOrder) {
        const sortIndicator = await this.prisma.detailedIndicator.findFirst({
          where: { delete: 0, indicatorEnName: sortField },
          select: { id: true },
        });

        if (!sortIndicator) {
          const countryIds = await this.prisma.indicatorValue.findMany({
            where: whereCondition,
            select: { countryId: true },
            distinct: ['countryId'],
            skip,
            take: pageSize,
            orderBy: { updateTime: 'desc' },
          });
          countryIdList = countryIds.map((i) => i.countryId);
        } else {
          const indicatorValuesForSort =
            await this.prisma.indicatorValue.findMany({
              where: {
                ...whereCondition,
                detailedIndicatorId: sortIndicator.id,
              },
              select: { countryId: true, value: true },
            });

          const countryToValueMap = new Map<string, number | null>();
          indicatorValuesForSort.forEach((iv) => {
            let v: number | null = null;
            if (iv.value !== null) {
              v =
                typeof iv.value === 'string'
                  ? Number(iv.value)
                  : iv.value.toNumber();
              if (Number.isNaN(v)) v = null;
            }
            countryToValueMap.set(iv.countryId, v);
          });

          const allCountryIds = countryGroups.map((g) => g.countryId);
          const sortedCountryIds = allCountryIds.sort((a, b) => {
            const aValue = countryToValueMap.has(a)
              ? countryToValueMap.get(a)!
              : null;
            const bValue = countryToValueMap.has(b)
              ? countryToValueMap.get(b)!
              : null;
            if (aValue == null && bValue == null) return 0;
            if (aValue == null) return 1;
            if (bValue == null) return -1;
            return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
          });
          countryIdList = sortedCountryIds.slice(skip, skip + pageSize);
        }
      } else {
        const countryIds = await this.prisma.indicatorValue.findMany({
          where: whereCondition,
          select: { countryId: true },
          distinct: ['countryId'],
          skip,
          take: pageSize,
          orderBy: { updateTime: 'desc' },
        });
        countryIdList = countryIds.map((i) => i.countryId);
      }

      // 批量获取该页的国家详细数据与所有指标列表
      const [indicatorValues, allDetailedIndicators] = await Promise.all([
        this.prisma.indicatorValue.findMany({
          where: {
            year,
            countryId: { in: countryIdList },
            delete: 0,
            country: { delete: 0 },
            detailedIndicator: { delete: 0 },
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
          orderBy: [{ country: { updateTime: 'desc' } }],
        }),
        this.prisma.detailedIndicator.findMany({
          where: { delete: 0 },
          select: { id: true, indicatorCnName: true, indicatorEnName: true },
        }),
      ]);

      const allIndicatorsMap = new Map(
        allDetailedIndicators.map((i) => [
          i.id,
          { cnName: i.indicatorCnName, enName: i.indicatorEnName },
        ]),
      );

      const countryDataMap = new Map<
        string,
        {
          country: (typeof indicatorValues)[0]['country'];
          indicators: Map<string, number | null>;
        }
      >();

      indicatorValues.forEach((iv) => {
        const countryId = iv.country.id;
        if (!countryDataMap.has(countryId)) {
          countryDataMap.set(countryId, {
            country: iv.country,
            indicators: new Map(),
          });
        }
        let processedValue: number | null = null;
        if (iv.value !== null) {
          processedValue =
            typeof iv.value === 'string'
              ? Number(iv.value)
              : iv.value.toNumber();
          if (Number.isNaN(processedValue)) processedValue = null;
        }
        countryDataMap
          .get(countryId)!
          .indicators.set(iv.detailedIndicatorId, processedValue);
      });

      const countryDataList: CountryData[] = countryIdList
        .map((countryId) => {
          const info = countryDataMap.get(countryId);
          if (!info) return null;
          const { country, indicators: indicatorMap } = info;
          const indicators = Array.from(allIndicatorsMap.entries()).map(
            ([id, info]) => ({
              id,
              cnName: info.cnName,
              enName: info.enName,
              value: indicatorMap.get(id) ?? null,
            }),
          );
          const isComplete = indicators.every((i) => i.value !== null);
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
        .filter(Boolean) as CountryData[];

      const totalPages = Math.ceil(totalCount / pageSize);
      const pagination: PaginationInfo = {
        page,
        pageSize,
        total: totalCount,
        totalPages,
      };

      const yearData: PaginatedYearData = {
        year,
        data: countryDataList,
        pagination,
      };
      return yearData;
    } catch (error) {
      this.logger.error(
        `[失败] 获取年份数据 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new BusinessException(
        ErrorCode.SYSTEM_ERROR,
        `获取年份数据失败: ${error instanceof Error ? error.message : '未知错误'}`,
      );
    }
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
      `[开始] 创建指标值数据 - 国家ID: ${countryId}, 年份: ${yearValue}, 指标数量: ${indicators.length}`,
    );

    // 步骤2: 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(
        `[验证失败] 创建指标值数据 - 国家ID ${countryId} 不存在`,
      );
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
          `[关联删除] 删除现有指标值数据 - 国家: ${country.cnName}, 年份: ${yearValue}, 删除数量: ${existingCount}`,
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
      `[成功] 创建指标值数据 - 国家: ${country.cnName}, 年份: ${yearValue}, 创建数量: ${result.count}`,
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
        `[警告] 批量创建指标值数据 - 数据量过大: ${countries.length} 个国家，建议分批处理`,
      );
      throw new BusinessException(
        ErrorCode.INVALID_INPUT,
        `批量导入数据量过大，最多支持500个国家，当前为${countries.length}个。建议分批处理或减少数据量。`,
      );
    }

    this.logger.log(
      `[开始] 批量创建指标值数据 - 年份: ${yearValue}, 国家数量: ${countries.length}`,
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
      this.logger.error(
        `[验证失败] 批量创建指标值数据 - 未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
      );
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
          `[关联删除] 删除现有指标值数据 - 年份: ${yearValue}, 国家数量: ${existingCountryIdsSet.size}, 删除数量: ${deleteResult.count}`,
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
      `[成功] 批量创建指标值数据 - 年份: ${yearValue}, 国家数量: ${countries.length}, 创建数量: ${result.totalCount}`,
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
      `[开始] 获取国家详细指标数据 - 国家ID: ${countryId}, 年份: ${yearValue}`,
    );

    // 步骤2: 获取国家基本信息
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(
        `[验证失败] 获取国家详细指标数据 - 国家ID ${countryId} 不存在`,
      );
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
      `[开始] 删除国家指标数据 - 国家ID: ${countryId}, 年份: ${yearValue}`,
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
      `[成功] 删除国家指标数据 - 国家ID: ${countryId}, 年份: ${yearValue}, 删除数量: ${count}`,
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
      `[开始] 检查国家指标数据 - 国家ID: ${countryId}, 年份: ${yearValue}`,
    );

    // 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(
        `[验证失败] 检查国家指标数据 - 国家ID ${countryId} 不存在`,
      );
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
      `[成功] 检查国家指标数据 - 国家: ${country.cnName}, 年份: ${yearValue}, ${
        exists ? `已有 ${count} 条数据` : '没有数据'
      }`,
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
      `[开始] 批量检查指标数据 - 年份: ${yearValue}, 国家数量: ${countryIds.length}`,
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
      this.logger.error(
        `[验证失败] 批量检查指标数据 - 未找到以下国家ID: ${invalidCountryIds.join(', ')}`,
      );
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
      `[成功] 批量检查指标数据 - 年份: ${yearValue}, 总数量: ${countryIds.length}, 已有数据: ${existingDataCountryIds.size}, 无数据: ${nonExistingCountryIds.length}`,
    );

    return {
      totalCount: countryIds.length,
      existingCount: existingDataCountryIds.size,
      existingCountries: Array.from(existingDataCountryIds),
      nonExistingCountries: nonExistingCountryIds,
    };
  }

  /**
   * 导出多个年份和多个国家的数据
   * @param params 多年份导出参数，包含年份-国家ID对数组和格式
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   */
  async exportDataMultiYear(
    params: ExportDataMultiYearReqDto,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    const { yearCountryPairs, format } = params;

    this.logger.log(
      `[开始] 多年份数据导出 - 年份数量: ${yearCountryPairs.length}, 格式: ${format}`,
    );

    // 步骤1: 获取所有三级指标定义作为表头
    const indicators = await this.prisma.detailedIndicator.findMany({
      where: { delete: 0 },
      orderBy: { createTime: 'asc' }, // 保证每次导出的指标顺序一致
    });
    this.logger.log(
      `[统计] 获取三级指标作为表头 - 共 ${indicators.length} 个指标`,
    );

    // 步骤2: 获取所有涉及的国家信息
    const allCountryIds = yearCountryPairs.flatMap((pair) => pair.countryIds);
    const uniqueCountryIds = [...new Set(allCountryIds)];

    const countries = await this.prisma.country.findMany({
      where: {
        id: { in: uniqueCountryIds },
        delete: 0,
      },
    });
    const countryMap = new Map(countries.map((c) => [c.id, c]));
    this.logger.log(
      `[统计] 获取涉及的国家信息 - 共 ${countries.length} 个国家`,
    );

    // 步骤3: 一次性获取所有相关指标值
    const allYearCountryPairs = yearCountryPairs.flatMap((pair) =>
      pair.countryIds.map((countryId) => ({ year: pair.year, countryId })),
    );

    const values = await this.prisma.indicatorValue.findMany({
      where: {
        OR: allYearCountryPairs.map(({ year, countryId }) => ({
          year,
          countryId,
        })),
        delete: 0,
      },
    });
    this.logger.log(`[统计] 查询相关指标值 - 共 ${values.length} 条数据`);

    // 步骤4: 将指标值处理成快速查找的嵌套Map: Map<year-countryId, Map<indicatorId, value>>
    const valuesMap = new Map<string, Map<string, number>>();
    for (const value of values) {
      const key = `${value.year}-${value.countryId}`;
      if (!valuesMap.has(key)) {
        valuesMap.set(key, new Map());
      }
      if (value.value !== null) {
        const numValue =
          typeof value.value === 'string'
            ? Number(value.value)
            : value.value.toNumber();
        valuesMap.get(key)!.set(value.detailedIndicatorId, numValue);
      }
    }

    // 步骤5: 根据格式生成不同的文件
    if (format === ExportFormat.JSON) {
      return this._generateMultiYearJsonFile(
        yearCountryPairs,
        indicators,
        countryMap,
        valuesMap,
      );
    } else if (format === ExportFormat.CSV) {
      // CSV格式只支持单年份，如果有多个年份，只导出第一个年份的数据
      if (yearCountryPairs.length > 1) {
        this.logger.warn(
          '[警告] 多年份数据导出 - CSV格式不支持多年份，只导出第一个年份的数据',
        );
      }
      return this._generateSingleYearCsvFile(
        yearCountryPairs[0],
        indicators,
        countryMap,
        valuesMap,
      );
    } else {
      // Excel格式支持多年份
      return this._generateMultiYearExcelFile(
        yearCountryPairs,
        indicators,
        countryMap,
        valuesMap,
      );
    }
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

  /**
   * 获取有数据的年份列表（用于导出页面优化）
   * @returns {Promise<DataManagementYearsResDto>} 年份数组，按降序排列
   */
  async getYears(): Promise<DataManagementYearsResDto> {
    this.logger.log('[开始] 获取有数据的年份列表');

    try {
      // 查询所有不重复的年份，只返回年份字段以减少数据传输
      const years = await this.prisma.indicatorValue.findMany({
        where: {
          delete: 0,
          country: { delete: 0 },
          detailedIndicator: { delete: 0 },
        },
        select: {
          year: true,
        },
        distinct: ['year'],
        orderBy: {
          year: 'desc',
        },
      });

      const result = years.map((item) => item.year);
      this.logger.log(
        `[成功] 获取有数据的年份列表 - 共 ${result.length} 个年份`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取有数据的年份列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 根据多个年份获取该年份下的国家列表（用于导出页面优化）
   * @param params 包含年份数组的请求参数
   * @returns {Promise<Array<{ year: number; countries: SimpleCountryData[] }>>} 按年份分组的国家列表
   */
  async getCountriesByYears(params: {
    years: number[];
  }): Promise<Array<{ year: number; countries: SimpleCountryData[] }>> {
    this.logger.log(`[开始] 获取年份 ${params.years.join(', ')} 下的国家列表`);

    try {
      const result: Array<{
        year: number;
        countries: SimpleCountryData[];
      }> = [];

      // 为每个年份查询对应的国家列表
      for (const year of params.years) {
        const countries = await this.prisma.indicatorValue.findMany({
          where: {
            year,
            delete: 0,
            country: { delete: 0 },
            detailedIndicator: { delete: 0 },
          },
          select: {
            country: {
              select: {
                id: true,
                cnName: true,
                enName: true,
              },
            },
          },
          distinct: ['countryId'],
          orderBy: {
            country: {
              cnName: 'asc', // 按中文名称排序
            },
          },
        });

        const yearCountries: SimpleCountryData[] = countries.map((item) => ({
          id: item.country.id,
          cnName: item.country.cnName,
          enName: item.country.enName,
        }));

        result.push({
          year,
          countries: yearCountries,
        });

        this.logger.log(
          `[统计] 年份 ${year} 下找到 ${yearCountries.length} 个国家`,
        );
      }

      this.logger.log(
        `[成功] 获取年份 ${params.years.join(', ')} 下的国家列表 - 共 ${result.length} 个年份组`,
      );
      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取年份 ${params.years.join(', ')} 下的国家列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * 生成多年份JSON文件（私有辅助方法）
   * @param yearCountryPairs 年份-国家ID对数组
   * @param indicators 指标列表
   * @param countryMap 国家映射
   * @param valuesMap 指标值映射
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   * @private
   */
  private _generateMultiYearJsonFile(
    yearCountryPairs: Array<{ year: number; countryIds: string[] }>,
    indicators: Array<{
      id: string;
      indicatorCnName: string;
      unit: string | null;
    }>,
    countryMap: Map<string, { id: string; cnName: string; enName: string }>,
    valuesMap: Map<string, Map<string, number>>,
  ): { buffer: Buffer; mime: string; fileName: string } {
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');
    const fileName = `多年份城镇化指标数据_${timestamp}.json`;

    // 构建JSON数据结构：按年份分组
    const jsonData: { [key: string]: any[] } = {};

    yearCountryPairs.forEach(({ year, countryIds }) => {
      const yearData: any[] = [];

      countryIds.forEach((countryId) => {
        const country = countryMap.get(countryId);
        if (!country) return;

        const countryData: { [key: string]: any } = { 国家: country.cnName };
        const key = `${year}-${countryId}`;
        const countryValues = valuesMap.get(key) || new Map<string, number>();

        indicators.forEach((indicator) => {
          const unit = indicator.unit ? `(${indicator.unit})` : '';
          const indicatorName = `${indicator.indicatorCnName}${unit}`;
          const value = countryValues.get(indicator.id);
          countryData[indicatorName] = value !== undefined ? value : null;
        });

        yearData.push(countryData);
      });

      jsonData[`${year}年`] = yearData;
    });

    const buffer = Buffer.from(JSON.stringify(jsonData, null, 2));
    const mime = 'application/json';

    return { buffer, mime, fileName };
  }

  /**
   * 生成单年份CSV文件（私有辅助方法）
   * @param yearCountryPair 年份-国家ID对
   * @param indicators 指标列表
   * @param countryMap 国家映射
   * @param valuesMap 指标值映射
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   * @private
   */
  private _generateSingleYearCsvFile(
    yearCountryPair: { year: number; countryIds: string[] },
    indicators: Array<{
      id: string;
      indicatorCnName: string;
      unit: string | null;
    }>,
    countryMap: Map<string, { id: string; cnName: string; enName: string }>,
    valuesMap: Map<string, Map<string, number>>,
  ): { buffer: Buffer; mime: string; fileName: string } {
    const { year, countryIds } = yearCountryPair;
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');
    const fileName = `${year}_城镇化指标数据_${timestamp}.csv`;

    // 构建表头
    const header = ['国家'];
    indicators.forEach((indicator) => {
      const unit = indicator.unit ? `(${indicator.unit})` : '';
      header.push(`${indicator.indicatorCnName}${unit}`);
    });

    // 构建数据行
    const dataRows: (string | number | null)[][] = [];
    countryIds.forEach((countryId) => {
      const country = countryMap.get(countryId);
      if (!country) return;

      const row: (string | number | null)[] = [country.cnName];
      const key = `${year}-${countryId}`;
      const countryValues = valuesMap.get(key) || new Map<string, number>();

      indicators.forEach((indicator) => {
        const value = countryValues.get(indicator.id);
        row.push(value !== undefined ? value : null);
      });

      dataRows.push(row);
    });

    // 生成CSV内容
    const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
    const csvOutput = xlsx.utils.sheet_to_csv(worksheet);

    // 添加BOM以防止Excel打开CSV时中文乱码
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const buffer = Buffer.concat([bom, Buffer.from(csvOutput)]);
    const mime = 'text/csv;charset=utf-8;';

    return { buffer, mime, fileName };
  }

  /**
   * 生成多年份Excel文件（私有辅助方法）
   * @param yearCountryPairs 年份-国家ID对数组
   * @param indicators 指标列表
   * @param countryMap 国家映射
   * @param valuesMap 指标值映射
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   * @private
   */
  private _generateMultiYearExcelFile(
    yearCountryPairs: Array<{ year: number; countryIds: string[] }>,
    indicators: Array<{
      id: string;
      indicatorCnName: string;
      unit: string | null;
    }>,
    countryMap: Map<string, { id: string; cnName: string; enName: string }>,
    valuesMap: Map<string, Map<string, number>>,
  ): { buffer: Buffer; mime: string; fileName: string } {
    const timestamp = dayjs().format('YYYY_MM_DD_HH_mm_ss');
    const fileName = `城镇化指标数据_${timestamp}.xlsx`;

    // 创建新的工作簿
    const workbook = xlsx.utils.book_new();

    // 为每个年份创建工作表
    yearCountryPairs.forEach(({ year, countryIds }) => {
      // 构建表头
      const header = ['国家'];
      indicators.forEach((indicator) => {
        const unit = indicator.unit ? `(${indicator.unit})` : '';
        header.push(`${indicator.indicatorCnName}${unit}`);
      });

      // 构建数据行
      const dataRows: (string | number | null)[][] = [];
      countryIds.forEach((countryId) => {
        const country = countryMap.get(countryId);
        if (!country) return;

        const row: (string | number | null)[] = [country.cnName];
        const key = `${year}-${countryId}`;
        const countryValues = valuesMap.get(key) || new Map<string, number>();

        indicators.forEach((indicator) => {
          const value = countryValues.get(indicator.id);
          row.push(value !== undefined ? value : null);
        });

        dataRows.push(row);
      });

      // 创建工作表
      const worksheet = xlsx.utils.aoa_to_sheet([header, ...dataRows]);
      const sheetName = `${year}年`;
      xlsx.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // 生成文件
    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;

    const mime =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return { buffer, mime, fileName };
  }
}
