import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  BatchCreateScoreDto,
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  ScoreEvaluationItemDto,
  CreateScoreDto,
  ScoreListDto,
  YearScoreData,
  ScoreDetailReqDto,
  DeleteScoreDto,
  CheckExistingDataResDto,
  CountryScoreData,
  CountryScoreDataItem,
} from 'types/dto';
import * as dayjs from 'dayjs';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Score, Country } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @class ScoreService
 * @description 封装与评分和评分评价相关的业务逻辑
 */
@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * @description 获取所有评分数据，并按年份进行分组。
   * @returns {Promise<ScoreListDto>} 按年份分组的评分数据。
   */
  async list(): Promise<ScoreListDto> {
    this.logger.log('开始从数据库获取所有评分数据。');

    // 1. 从数据库查询所有未被软删除的评分记录
    //    - 包含关联的国家信息
    //    - 按年份降序排序
    const scores = await this.prisma.score.findMany({
      where: {
        delete: 0, // 过滤未被删除的记录
        country: {
          delete: 0, // 确保关联的国家也未被删除
        },
      },
      include: {
        country: true, // 包含关联的国家实体
      },
      orderBy: {
        year: 'desc', // 按年份降序排序
      },
    });

    // 如果查询结果为空，直接返回空数组
    if (!scores || scores.length === 0) {
      this.logger.log('未找到任何评分数据，返回空数组。');
      return [];
    }

    // 2. 使用 Map 按年份对数据进行分组
    //    - Key: 年份 (number)
    //    - Value: 当年的所有评分记录数组 (Score with Country)
    const groupedByYear = new Map<number, (Score & { country: Country })[]>();
    for (const score of scores) {
      const year = dayjs(score.year).year();
      // 如果 Map 中尚不存在该年份的键，则初始化一个空数组
      if (!groupedByYear.has(year)) {
        groupedByYear.set(year, []);
      }
      // 将当前记录添加到对应年份的数组中
      groupedByYear.get(year)!.push(score);
    }

    // 3. 将分组后的 Map 转换为 DTO 所需的数组结构
    const result: ScoreListDto = [];
    for (const [year, yearScores] of groupedByYear.entries()) {
      const yearData: YearScoreData = {
        year: dayjs().year(year).month(5).date(1).toDate(), // 将年份数字转换为 Date 对象
        // 遍历当年的所有评分记录，并将其映射为 DTO 格式
        data: yearScores.map((score) => {
          const s = score as Score & { country: Country };
          return {
            id: s.id,
            countryId: s.countryId,
            cnName: s.country.cnName,
            enName: s.country.enName,
            year: s.year,
            totalScore:
              s.totalScore instanceof Decimal
                ? s.totalScore.toNumber()
                : s.totalScore,
            urbanizationProcessDimensionScore:
              s.urbanizationProcessDimensionScore instanceof Decimal
                ? s.urbanizationProcessDimensionScore.toNumber()
                : s.urbanizationProcessDimensionScore,
            humanDynamicsDimensionScore:
              s.humanDynamicsDimensionScore instanceof Decimal
                ? s.humanDynamicsDimensionScore.toNumber()
                : s.humanDynamicsDimensionScore,
            materialDynamicsDimensionScore:
              s.materialDynamicsDimensionScore instanceof Decimal
                ? s.materialDynamicsDimensionScore.toNumber()
                : s.materialDynamicsDimensionScore,
            spatialDynamicsDimensionScore:
              s.spatialDynamicsDimensionScore instanceof Decimal
                ? s.spatialDynamicsDimensionScore.toNumber()
                : s.spatialDynamicsDimensionScore,
            createTime: s.createTime,
            updateTime: s.updateTime,
          };
        }),
      };
      result.push(yearData);
    }

    this.logger.log('评分数据处理完成。');
    return result;
  }

  /**
   * @description 获取所有评分数据，并按国家进行分组。
   * @returns {Promise<CountryScoreData[]>} 按国家分组的评分数据。
   */
  async listByCountry(): Promise<CountryScoreData[]> {
    this.logger.log('开始从数据库获取所有评分数据，并按国家分组。');

    // 1. 从数据库查询所有未被软删除的评分记录
    //    - 包含关联的国家信息
    //    - 按国家中文名升序, 年份降序排序
    const scores = await this.prisma.score.findMany({
      where: {
        delete: 0, // 过滤未被删除的记录
        country: {
          delete: 0, // 确保关联的国家也未被删除
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
      this.logger.log('未找到任何评分数据，返回空数组。');
      return [];
    }

    // 2. 使用 Map 按国家对数据进行分组
    //    - Key: countryId (number)
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
            id: score.id,
            year: score.year,
            totalScore:
              score.totalScore instanceof Decimal
                ? score.totalScore.toNumber()
                : score.totalScore,
            urbanizationProcessDimensionScore:
              score.urbanizationProcessDimensionScore instanceof Decimal
                ? score.urbanizationProcessDimensionScore.toNumber()
                : score.urbanizationProcessDimensionScore,
            humanDynamicsDimensionScore:
              score.humanDynamicsDimensionScore instanceof Decimal
                ? score.humanDynamicsDimensionScore.toNumber()
                : score.humanDynamicsDimensionScore,
            materialDynamicsDimensionScore:
              score.materialDynamicsDimensionScore instanceof Decimal
                ? score.materialDynamicsDimensionScore.toNumber()
                : score.materialDynamicsDimensionScore,
            spatialDynamicsDimensionScore:
              score.spatialDynamicsDimensionScore instanceof Decimal
                ? score.spatialDynamicsDimensionScore.toNumber()
                : score.spatialDynamicsDimensionScore,
            createTime: score.createTime,
            updateTime: score.updateTime,
          };
        }),
      };
      result.push(countryData);
    }

    this.logger.log('按国家分组的评分数据处理完成。');
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
    // 标准化年份为 Date 对象 (取年份的6月1日)
    const yearDate = dayjs(year).month(5).date(1).toDate();

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
        year: yearDate,
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
      year: yearDate,
    };

    // 5. 根据记录是否存在，执行更新或创建操作
    if (existingScore) {
      // 如果记录已存在，则更新现有记录
      this.logger.log(
        `正在更新国家 ${countryId} 在 ${dayjs(year).year()} 年的评分记录。`,
      );
      return this.prisma.score.update({
        where: { id: existingScore.id },
        data: scoreData,
      });
    } else {
      // 如果记录不存在，则创建新记录
      this.logger.log(
        `正在为国家 ${countryId} 在 ${dayjs(year).year()} 年创建新的评分记录。`,
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
    // 标准化年份为 Date 对象 (取年份的6月1日)
    const yearDate = dayjs(year).month(5).date(1).toDate();
    const yearValue = dayjs(yearDate).year();

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
        year: yearDate,
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
          year: yearDate,
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
    const yearDate = dayjs(year).month(5).date(1).toDate(); // 标准化年份

    // 查询特定国家和年份的评分记录
    const score = await this.prisma.score.findFirst({
      where: { countryId, year: yearDate, delete: 0 },
      include: {
        country: true, // 同时返回关联的国家信息
      },
    });

    // 如果未找到记录，则抛出业务异常
    if (!score) {
      throw new BusinessException(
        ErrorCode.RESOURCE_NOT_FOUND,
        `未找到国家 ID ${countryId} 在 ${dayjs(year).year()} 年的评分记录`,
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
    const yearDate = dayjs(year).month(5).date(1).toDate();

    const count = await this.prisma.score.count({
      where: {
        countryId,
        year: yearDate,
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
    const yearDate = dayjs(year).month(5).date(1).toDate();
    const yearValue = dayjs(yearDate).year();

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
        year: yearDate,
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
  findAllEvaluations() {
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
  async createEvaluations(data: ScoreEvaluationItemDto[]) {
    // 1. 先删除所有现有的评价规则
    await this.prisma.scoreEvaluation.deleteMany({});
    // 2. 批量创建新的评价规则
    return this.prisma.scoreEvaluation.createMany({
      data,
    });
  }
}
