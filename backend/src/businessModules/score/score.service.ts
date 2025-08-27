import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../../commonModules/upload/upload.service';
import { ImageProcessorUtils } from '../../common/upload';
import {
  BatchCreateScoreDto,
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  ScoreEvaluationItemDto,
  CreateScoreDto,
  PaginatedYearScoreData,
  ScoreDataItem,
  ScoreDetailReqDto,
  DeleteScoreDto,
  CheckExistingDataResDto,
  CountryScoreData,
  CountryScoreDataItem,
  ScoreListByYearReqDto,
  ScoreListByYearResDto,
} from 'types/dto';

import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Score, Country } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

function decimalToNumber(value: Decimal | number): number {
  return value instanceof Decimal ? value.toNumber() : value;
}

/**
 * @class ScoreService
 * @description 封装与评分和评分评价相关的业务逻辑
 */
@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);
  constructor(
    private prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * @description 获取所有有评分数据的年份列表
   * @returns {Promise<number[]>} 年份数组
   */
  async getYears(): Promise<number[]> {
    const years = await this.prisma.score.findMany({
      where: {
        delete: 0,
        country: {
          delete: 0,
        },
      },
      select: {
        year: true,
      },
      distinct: ['year'],
      orderBy: {
        year: 'desc',
      },
    });

    return years.map((item) => item.year);
  }

  /**
   * @description 获取所有评分数据，按国家分组
   */
  async listByCountry(): Promise<CountryScoreData[]> {
    this.logger.log(
      '开始从数据库获取所有评分数据，并按国家分组，只返回城镇化的国家。',
    );

    // 1. 从数据库查询所有未被软删除的评分记录，只包含城镇化为"是"的国家
    //    - 包含关联的国家信息
    //    - 按国家中文名升序, 年份降序排序
    const scores = await this.prisma.score.findMany({
      where: {
        delete: 0, // 过滤未被删除的记录
        country: {
          delete: 0, // 确保关联的国家也未被删除
          urbanizationWorldMap: {
            some: {
              urbanization: true, // 只包含城镇化为"是"的国家
              delete: 0,
            },
          },
        },
      },
      include: {
        country: true, // 包含关联的国家实体
      },
      orderBy: [
        {
          country: {
            cnName: 'asc',
          },
        },
        {
          year: 'desc',
        },
      ],
    });

    // 如果查询结果为空，直接返回空数组
    if (!scores || scores.length === 0) {
      this.logger.log('未找到任何城镇化国家的评分数据，返回空数组。');
      return [];
    }

    // 2. 使用 Map 按国家对数据进行分组
    //    - Key: countryId (string)
    //    - Value: 当个国家的所有评分记录数组 (Score with Country)
    const groupedByCountry = new Map<
      string,
      (Score & { country: Country })[]
    >();
    for (const score of scores) {
      const countryId = score.countryId;
      // 如果 Map 中尚不存在该国家的键，则初始化一个空数组
      if (!groupedByCountry.has(countryId)) {
        groupedByCountry.set(countryId, []);
      }
      // 将当前记录添加到对应国家的数组中
      groupedByCountry.get(countryId)!.push(score);
    }

    // 3. 将分组后的 Map 转换为 DTO 所需的数组结构
    const result: CountryScoreData[] = [];
    for (const [, countryScores] of groupedByCountry.entries()) {
      const firstScore = countryScores[0]; // All scores in this group have the same country info
      const countryData: CountryScoreData = {
        countryId: firstScore.countryId,
        cnName: firstScore.country.cnName,
        enName: firstScore.country.enName,
        // 遍历该国家的所有评分记录，并将其映射为 DTO 格式
        data: countryScores.map((score): CountryScoreDataItem => {
          return {
            year: score.year,
          };
        }),
      };
      result.push(countryData);
    }

    this.logger.log('按国家分组的评分数据处理完成，只包含城镇化的国家。');
    return result;
  }

  /**
   * @description 获取指定年份的评分数据（分页、排序、搜索）
   */
  async listByYear(
    params: ScoreListByYearReqDto,
  ): Promise<ScoreListByYearResDto> {
    const {
      year,
      page = 1,
      pageSize = 10,
      searchTerm,
      sortField,
      sortOrder,
    } = params;

    const skip = (page - 1) * pageSize;

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
    } as const;

    const totalCount = await this.prisma.score
      .groupBy({
        by: ['countryId'],
        where: whereCondition,
        _count: { countryId: true },
      })
      .then((groups) => groups.length);

    let countryIdList: string[] = [];
    if (sortField && sortOrder) {
      const allScores = await this.prisma.score.findMany({
        where: whereCondition,
        include: { country: true },
      });

      const sortedScores = allScores.sort((a, b) => {
        let aValue: number | null = null;
        let bValue: number | null = null;
        switch (sortField) {
          case 'totalScore':
            aValue = decimalToNumber(a.totalScore);
            bValue = decimalToNumber(b.totalScore);
            break;
          case 'urbanizationProcessDimensionScore':
            aValue = decimalToNumber(a.urbanizationProcessDimensionScore);
            bValue = decimalToNumber(b.urbanizationProcessDimensionScore);
            break;
          case 'humanDynamicsDimensionScore':
            aValue = decimalToNumber(a.humanDynamicsDimensionScore);
            bValue = decimalToNumber(b.humanDynamicsDimensionScore);
            break;
          case 'materialDynamicsDimensionScore':
            aValue = decimalToNumber(a.materialDynamicsDimensionScore);
            bValue = decimalToNumber(b.materialDynamicsDimensionScore);
            break;
          case 'spatialDynamicsDimensionScore':
            aValue = decimalToNumber(a.spatialDynamicsDimensionScore);
            bValue = decimalToNumber(b.spatialDynamicsDimensionScore);
            break;
          default:
            return sortOrder === 'asc'
              ? a.country.updateTime.getTime() - b.country.updateTime.getTime()
              : b.country.updateTime.getTime() - a.country.updateTime.getTime();
        }
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });

      const uniqueCountryIds = [
        ...new Set(sortedScores.map((s) => s.countryId)),
      ];
      countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);
    } else {
      const allCountryIds = await this.prisma.score.findMany({
        where: whereCondition,
        select: { countryId: true },
        orderBy: { country: { updateTime: 'desc' } },
      });
      const uniqueCountryIds = [
        ...new Set(
          allCountryIds.map((i: { countryId: string }) => i.countryId),
        ),
      ];
      countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);
    }

    const scores = await this.prisma.score.findMany({
      where: {
        year,
        countryId: { in: countryIdList },
        delete: 0,
        country: { delete: 0 },
      },
      include: { country: true },
      orderBy: [{ country: { updateTime: 'desc' } }],
    });

    const data: ScoreDataItem[] = countryIdList
      .map((cid) => {
        const items = scores.filter((s) => s.countryId === cid);
        if (items.length === 0) return null;
        const base = items[0];
        return {
          id: base.id,
          countryId: base.countryId,
          cnName: base.country.cnName,
          enName: base.country.enName,
          year: base.year,
          totalScore: decimalToNumber(base.totalScore),
          urbanizationProcessDimensionScore: decimalToNumber(
            base.urbanizationProcessDimensionScore,
          ),
          humanDynamicsDimensionScore: decimalToNumber(
            base.humanDynamicsDimensionScore,
          ),
          materialDynamicsDimensionScore: decimalToNumber(
            base.materialDynamicsDimensionScore,
          ),
          spatialDynamicsDimensionScore: decimalToNumber(
            base.spatialDynamicsDimensionScore,
          ),
          createTime: base.country.createTime,
          updateTime: base.country.updateTime,
        } as ScoreDataItem;
      })
      .filter(Boolean) as ScoreDataItem[];

    const totalPages = Math.ceil(totalCount / pageSize);
    const pagination = { page, pageSize, total: totalCount, totalPages };

    const result: PaginatedYearScoreData = { year, data, pagination };
    return result;
  }

  /**
   * @description 创建或更新一个评分记录。如果给定国家和年份的记录已存在，则更新它；否则，创建新记录。
   * @param {CreateScoreDto} data - 创建或更新评分所需的数据。
   * @returns {Promise<Score>} 创建或更新后的评分记录。
   */
  async create(data: CreateScoreDto): Promise<Score> {
    // 1. 从 DTO 中解构所需参数
    const {
      countryId,
      year,
      totalScore,
      urbanizationProcessDimensionScore,
      humanDynamicsDimensionScore,
      materialDynamicsDimensionScore,
      spatialDynamicsDimensionScore,
    } = data;
    // 直接使用数字年份
    const yearValue = year;

    // 2. 验证关联的国家是否存在且未被删除
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });
    if (!country) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到 ID 为 ${countryId} 的国家`,
      );
    }

    // 3. 检查该国家在该年份是否已存在评分记录
    const existingScore = await this.prisma.score.findFirst({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
    });

    // 4. 准备要写入数据库的评分数据
    const scoreData = {
      totalScore,
      urbanizationProcessDimensionScore,
      humanDynamicsDimensionScore,
      materialDynamicsDimensionScore,
      spatialDynamicsDimensionScore,
      year: yearValue,
    };

    // 5. 根据记录是否存在，执行更新或创建操作
    if (existingScore) {
      // 如果记录已存在，则更新现有记录
      this.logger.log(`正在更新国家 ${countryId} 在 ${year} 年的评分记录。`);
      return this.prisma.score.update({
        where: { id: existingScore.id },
        data: scoreData,
      });
    } else {
      // 如果记录不存在，则创建新记录
      this.logger.log(
        `正在为国家 ${countryId} 在 ${year} 年创建新的评分记录。`,
      );
      return this.prisma.score.create({
        data: {
          ...scoreData,
          country: {
            connect: { id: countryId }, // 关联到国家
          },
        },
      });
    }
  }

  /**
   * @description 批量创建或更新多个国家的评分记录。
   * @param {BatchCreateScoreDto} data - 包含年份和多个国家的评分数据。
   * @returns {Promise<{totalCount: number, successCount: number, failCount: number, failedCountries: string[]}>} 批量创建的结果统计。
   */
  async batchCreate(data: BatchCreateScoreDto): Promise<{
    totalCount: number;
    successCount: number;
    failCount: number;
    failedCountries: string[];
  }> {
    const { year, scores } = data;
    // 直接使用数字年份
    const yearValue = year;

    // 验证请求数据大小，防止过大的请求导致性能问题
    if (scores.length > 500) {
      this.logger.warn(
        `批量导入评分数据量过大: ${scores.length} 个国家，建议分批处理`,
      );
      throw new BusinessException(
        ErrorCode.INVALID_INPUT,
        `批量导入评分数据量过大，最多支持500个国家，当前为${scores.length}个。建议分批处理或减少数据量。`,
      );
    }

    this.logger.log(
      `准备批量创建 ${scores.length} 个国家在 ${yearValue} 年的评分数据`,
    );

    // 步骤1: 验证所有国家是否存在
    const countryIds = scores.map((s) => s.countryId);
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
    const existingScores = await this.prisma.score.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearValue,
        delete: 0,
      },
      select: {
        id: true,
        countryId: true,
      },
    });

    const existingScoreMap = new Map(
      existingScores.map((s) => [s.countryId, s.id]),
    );

    // 步骤3: 执行批量数据库操作
    const result = await this.prisma.$transaction(async (prisma) => {
      let totalCount = 0;

      // 处理每个国家的评分数据
      for (const scoreData of scores) {
        const { countryId, ...scoreFields } = scoreData;

        // 准备要写入数据库的评分数据
        const dataToSave = {
          ...scoreFields,
          year: yearValue,
        };

        // 检查是否已存在记录
        const existingScoreId = existingScoreMap.get(countryId);

        if (existingScoreId) {
          // 如果记录已存在，则更新现有记录
          await prisma.score.update({
            where: { id: existingScoreId },
            data: dataToSave,
          });
        } else {
          // 如果记录不存在，则创建新记录
          await prisma.score.create({
            data: {
              ...dataToSave,
              country: {
                connect: { id: countryId },
              },
            },
          });
        }
        totalCount++;
      }

      return { totalCount };
    });

    this.logger.log(
      `成功批量创建了 ${scores.length} 个国家在 ${yearValue} 年的评分数据`,
    );

    return {
      totalCount: result.totalCount,
      successCount: scores.length,
      failCount: 0,
      failedCountries: [],
    };
  }

  /**
   * @description 获取特定国家和年份的评分详情。
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year。
   * @returns {Promise<Score>} 评分详情记录。
   */
  async detail(params: ScoreDetailReqDto): Promise<Score> {
    const { countryId, year } = params;
    const yearValue = year; // 直接使用数字年份

    // 查询特定国家和年份的评分记录
    const score = await this.prisma.score.findFirst({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
      include: {
        country: true, // 同时返回关联的国家信息
      },
    });

    // 如果未找到记录，则抛出业务异常
    if (!score) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到国家 ID ${countryId} 在 ${year} 年的评分记录`,
      );
    }
    return score;
  }

  /**
   * @description 检查特定国家和年份的评分数据是否存在.
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year.
   * @returns {Promise<CheckExistingDataResDto>} 包含存在状态和计数的对象.
   */
  async checkExistingData(
    params: ScoreDetailReqDto,
  ): Promise<CheckExistingDataResDto> {
    const { countryId, year } = params;
    const yearValue = year; // 直接使用数字年份

    const count = await this.prisma.score.count({
      where: {
        countryId,
        year: yearValue,
        delete: 0,
      },
    });

    return {
      exists: count > 0,
      count,
    };
  }

  /**
   * @description 批量检查多个国家和年份的评分数据是否存在.
   * @param {BatchCheckScoreExistingDto} data - 包含年份和国家ID数组.
   * @returns {Promise<BatchCheckScoreExistingResDto>} 批量检查结果，包含已存在和不存在的国家列表.
   */
  async batchCheckExistingData(
    data: BatchCheckScoreExistingDto,
  ): Promise<BatchCheckScoreExistingResDto> {
    const { year, countryIds } = data;
    const yearValue = year; // 直接使用数字年份

    this.logger.log(
      `准备批量检查 ${countryIds.length} 个国家在 ${yearValue} 年的评分数据是否存在`,
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

    // 步骤2: 批量查询已存在的评分数据
    const existingScores = await this.prisma.score.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearValue,
        delete: 0,
      },
      select: {
        countryId: true,
      },
    });

    const existingScoreCountryIds = new Set(
      existingScores.map((s) => s.countryId),
    );
    const nonExistingCountryIds = countryIds.filter(
      (id) => !existingScoreCountryIds.has(id),
    );

    this.logger.log(
      `批量检查完成: ${countryIds.length} 个国家中，${existingScoreCountryIds.size} 个已有评分数据，${nonExistingCountryIds.length} 个没有评分数据`,
    );

    return {
      totalCount: countryIds.length,
      existingCount: existingScoreCountryIds.size,
      existingCountries: Array.from(existingScoreCountryIds),
      nonExistingCountries: nonExistingCountryIds,
    };
  }

  /**
   * @description 删除一个评分记录（软删除）。
   * @param {DeleteScoreDto} params - 包含要删除的记录的 ID。
   * @returns {Promise<Score>} 已更新的评分记录（标记为已删除）。
   */
  async delete(params: DeleteScoreDto): Promise<Score> {
    const { id } = params;
    // 1. 检查记录是否存在
    const score = await this.prisma.score.findFirst({
      where: { id, delete: 0 },
    });
    if (!score) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到 ID 为 ${id} 的评分记录`,
      );
    }

    // 2. 执行软删除操作（将 delete 字段更新为 1）
    return this.prisma.score.update({
      where: { id },
      data: { delete: 1 },
    });
  }

  /**
   * @description 获取所有评分评价规则。
   * @returns {Promise<ScoreEvaluation[]>} 按最小评分升序排列的评价规则列表。
   */
  listEvaluation() {
    return this.prisma.scoreEvaluation.findMany({
      orderBy: {
        minScore: 'asc', // 按最小评分升序排序
      },
    });
  }

  /**
   * @description 批量创建评分评价规则，此操作会先清空所有现有规则。
   * @param {ScoreEvaluationItemDto[]} data - 新的评分评价规则数组。
   * @returns {Promise<Prisma.BatchPayload>} 创建操作的结果。
   */
  async createEvaluation(data: ScoreEvaluationItemDto[]) {
    // 1. 先删除所有现有的评价规则
    await this.prisma.scoreEvaluation.deleteMany({});

    // 2. 使用工具类处理每个评价规则的图片数据
    const { processedData, allDeletedImages } =
      ImageProcessorUtils.processEvaluationImages(data);

    // 3. 批量创建新的评价规则
    const result = await this.prisma.scoreEvaluation.createMany({
      data: processedData,
    });

    // 4. 异步清理不再使用的图片，不阻塞主流程
    ImageProcessorUtils.cleanupImagesAsync(
      this.uploadService,
      this.logger,
      allDeletedImages,
      '后台图片清理',
    );

    return result;
  }
}
