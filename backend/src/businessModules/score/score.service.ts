import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UploadService } from '../../commonModules/upload/upload.service';
import { ImageProcessorUtils } from '../../common/upload';
import {
  BatchCreateScoreDto,
  BatchCheckScoreExistingDto,
  BatchCheckScoreExistingResDto,
  ScoreEvaluationItemDto,
  ScoreEvaluationResponseDto,
  CreateScoreDto,
  PaginatedYearScoreData,
  ScoreDataItem,
  ScoreDetailReqDto,
  ScoreDetailResponseDto,
  DeleteScoreDto,
  CheckExistingDataResDto,
  CountryScoreData,
  CountryScoreDataItem,
  ScoreListByYearReqDto,
  ScoreListByYearResDto,
  ScoreEvaluationDetailListItemDto,
  ScoreEvaluationDetailListByYearReqDto,
  ScoreEvaluationDetailListByYearResDto,
  ScoreEvaluationDetailGetReqDto,
  ScoreEvaluationDetailEditResDto,
  UpsertScoreEvaluationDetailDto,
  DataManagementCountriesByYearsReqDto,
  DataManagementCountriesByYearsResDto,
  ExportDataMultiYearReqDto,
  ExportFormat,
  DeleteScoreEvaluationDetailDto,
} from 'types/dto';
import * as xlsx from 'xlsx';
import { BusinessException } from '../../common/exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Score } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * 将 Prisma Decimal 或其他数值类型转换为 number
 * 处理 Prisma 在某些情况下将 Decimal 序列化为对象的问题
 * @param value 要转换的值
 * @returns 转换后的 number 类型值
 */
function decimalToNumber(value: unknown): number {
  if (value instanceof Decimal) {
    return value.toNumber();
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && !isNaN(Number(value))) {
    return Number(value);
  }

  // 处理可能是对象的情况（可能是 Prisma 的序列化问题）
  if (typeof value === 'object' && value !== null) {
    const maybeValueOf = (value as { valueOf?: () => unknown }).valueOf;
    if (typeof maybeValueOf === 'function') {
      const primitive: unknown = maybeValueOf.call(value);
      if (typeof primitive === 'number') return primitive;
      if (typeof primitive === 'string' && !isNaN(Number(primitive))) {
        return Number(primitive);
      }
    }
  }

  return 0;
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
    this.logger.log('[开始] 获取评分数据年份列表');

    try {
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

      this.logger.log(
        `[成功] 获取评分数据年份列表 - 共 ${years.length} 个年份`,
      );
      return years.map((item) => item.year);
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分数据年份列表 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取所有评分数据，按国家分组
   */
  async listByCountry(): Promise<CountryScoreData[]> {
    this.logger.log('[开始] 获取评分数据并按国家分组');

    try {
      // 获取所有评分数据
      const scores = await this.prisma.score.findMany({
        where: {
          delete: 0,
          country: {
            delete: 0,
          },
        },
        include: {
          country: true,
        },
        orderBy: [{ country: { cnName: 'asc' } }, { year: 'desc' }],
      });

      if (!scores || scores.length === 0) {
        this.logger.log('未找到任何城镇化国家的评分数据，返回空数组。');
        return [];
      }

      // 按国家分组
      const countryMap = new Map<string, CountryScoreDataItem[]>();
      scores.forEach((score) => {
        const countryId = score.countryId;
        if (!countryMap.has(countryId)) {
          countryMap.set(countryId, []);
        }
        countryMap.get(countryId)!.push({
          year: score.year,
        });
      });

      // 转换为最终格式
      const result: CountryScoreData[] = Array.from(countryMap.entries()).map(
        ([countryId, scoreItems]) => {
          const country = scores.find(
            (s) => s.countryId === countryId,
          )!.country;
          return {
            countryId,
            cnName: country.cnName,
            enName: country.enName,
            data: scoreItems.sort((a, b) => b.year - a.year),
          };
        },
      );

      this.logger.log('按国家分组的评分数据处理完成，只包含城镇化的国家。');
      return result;
    } catch (error) {
      this.logger.error(
        `[失败] 获取评分数据并按国家分组 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
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
   * @description 评价详情（自定义文案）列表：
   * 仅返回综合分、评价规则匹配文案、是否存在自定义详情的标记。
   * 注意：与“评分详情（ScoreDetail）”不同；此处不返回四个维度得分，仅用于自定义评价详情管理列表。
   * 不需要排序，支持搜索与分页。分页逻辑基于唯一国家分页，与评分管理列表一致。
   */
  async listEvaluationDetailByYear(
    params: ScoreEvaluationDetailListByYearReqDto,
  ): Promise<ScoreEvaluationDetailListByYearResDto> {
    const { year, page = 1, pageSize = 10, searchTerm } = params;

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

    // 统计该年份国家数量（去重）
    const totalCount = await this.prisma.score
      .groupBy({
        by: ['countryId'],
        where: whereCondition,
        _count: { countryId: true },
      })
      .then((groups) => groups.length);

    // 取出去重后的国家ID并分页
    const allCountryIds = await this.prisma.score.findMany({
      where: whereCondition,
      select: { countryId: true },
      orderBy: { country: { updateTime: 'desc' } },
    });
    const uniqueCountryIds = [
      ...new Set(allCountryIds.map((i: { countryId: string }) => i.countryId)),
    ];
    const countryIdList = uniqueCountryIds.slice(skip, skip + pageSize);

    // 查询分页后的评分记录
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

    // 读取评价体系规则，用于匹配文案
    const evaluations = await this.prisma.scoreEvaluation.findMany({
      orderBy: { minScore: 'asc' },
    });

    const matchText = (scoreNum: number): string => {
      for (const e of evaluations) {
        const min = decimalToNumber(e.minScore);
        const max = decimalToNumber(e.maxScore);
        if (scoreNum >= min && scoreNum <= max) return e.evaluationText;
      }
      return '';
    };

    // 查询自定义详情存在性
    const details = await this.prisma.scoreEvaluationDetail.findMany({
      where: { year, countryId: { in: countryIdList }, delete: 0 },
      select: { countryId: true },
    });
    const hasDetailSet = new Set(details.map((d) => d.countryId));

    const data: ScoreEvaluationDetailListItemDto[] = countryIdList.reduce<
      ScoreEvaluationDetailListItemDto[]
    >((acc, cid) => {
      const item = scores.find((s) => s.countryId === cid);
      if (!item) return acc;
      const totalScore = decimalToNumber(item.totalScore);
      acc.push({
        id: item.id,
        countryId: item.countryId,
        cnName: item.country.cnName,
        enName: item.country.enName,
        year: item.year,
        totalScore,
        matchedText: matchText(totalScore),
        hasCustomDetail: hasDetailSet.has(item.countryId),
        createTime: item.country.createTime,
        updateTime: item.country.updateTime,
      });
      return acc;
    }, []);

    const totalPages = Math.ceil(totalCount / pageSize);
    const pagination = { page, pageSize, total: totalCount, totalPages };

    return { year, data, pagination };
  }

  /**
   * @description 获取评价详情（自定义文案）编辑数据
   */
  async getEvaluationDetail(
    params: ScoreEvaluationDetailGetReqDto,
  ): Promise<ScoreEvaluationDetailEditResDto | null> {
    const { year, countryId } = params;
    const record = await this.prisma.scoreEvaluationDetail.findFirst({
      where: { year, countryId, delete: 0 },
    });
    if (!record) return null;
    return {
      id: record.id,
      year: record.year,
      countryId: record.countryId,
      text: (record as unknown as { text?: string }).text ?? '',
      images: (record.images as string[]) || [],
      createTime: record.createTime,
      updateTime: record.updateTime,
    };
  }

  /**
   * @description 保存/更新评价详情（自定义文案）
   * - 纠正 images/deletedImages，避免误删
   * - 更新后异步清理删除的图片
   */
  async upsertEvaluationDetail(
    dto: UpsertScoreEvaluationDetailDto,
  ): Promise<ScoreEvaluationDetailEditResDto> {
    const { year, countryId, text } = dto;
    const cleanedImages = ImageProcessorUtils.cleanImageFilenames(
      dto.images || [],
    );
    const cleanedDeleted = ImageProcessorUtils.cleanImageFilenames(
      dto.deletedImages || [],
    );

    const reconciled = ImageProcessorUtils.reconcileImages(
      cleanedImages,
      cleanedDeleted,
      text,
    );

    const existing = await this.prisma.scoreEvaluationDetail.findFirst({
      where: { year, countryId, delete: 0 },
    });

    const dataToSave = {
      text,
      images: reconciled.images,
    } as const;

    const saved = existing
      ? await this.prisma.scoreEvaluationDetail.update({
          where: { id: existing.id },
          data: dataToSave,
        })
      : await this.prisma.scoreEvaluationDetail.create({
          data: {
            year,
            country: { connect: { id: countryId } },
            ...dataToSave,
          },
        });

    // 异步清理图片
    ImageProcessorUtils.cleanupImagesAsync(
      this.uploadService,
      this.logger,
      reconciled.deletedImages,
      '评价详情更新，图片清理',
    );

    return {
      id: saved.id,
      year: saved.year,
      countryId: saved.countryId,
      text: (saved as unknown as { text?: string }).text ?? '',
      images: (saved.images as string[]) || [],
      createTime: saved.createTime,
      updateTime: saved.updateTime,
    };
  }

  /**
   * @description 删除评价详情（自定义文案）
   * - 物理删除评价详情记录
   * - 异步清理该评价详情关联的图片
   */
  async deleteEvaluationDetail(
    dto: DeleteScoreEvaluationDetailDto,
  ): Promise<void> {
    const { year, countryId } = dto;
    this.logger.log(
      `[开始] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
    );

    try {
      // 1. 查找要删除的评价详情，以获取其图片列表
      const detailToDelete = await this.prisma.scoreEvaluationDetail.findFirst({
        where: { year, countryId, delete: 0 },
      });

      if (!detailToDelete) {
        this.logger.warn(
          `[验证失败] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `评价详情不存在或已被删除`,
        );
      }

      // 2. 物理删除
      const deletedDetail = await this.prisma.scoreEvaluationDetail.delete({
        where: { id: detailToDelete.id },
      });

      // 3. 异步清理该评价详情关联的图片
      ImageProcessorUtils.cleanupImagesAsync(
        this.uploadService,
        this.logger,
        deletedDetail.images as string[],
        '删除评价详情后的图片清理',
      );

      this.logger.log(
        `[成功] 删除评价详情 - 年份: ${year}, 国家ID: ${countryId}`,
      );
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除评价详情 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
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
   * @returns {Promise<ScoreDetailResponseDto>} 评分详情记录。
   */
  async detail(params: ScoreDetailReqDto): Promise<ScoreDetailResponseDto> {
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

    // 将 Prisma Decimal 转换为 number 类型
    return {
      id: score.id,
      totalScore: decimalToNumber(score.totalScore),
      urbanizationProcessDimensionScore: decimalToNumber(
        score.urbanizationProcessDimensionScore,
      ),
      humanDynamicsDimensionScore: decimalToNumber(
        score.humanDynamicsDimensionScore,
      ),
      materialDynamicsDimensionScore: decimalToNumber(
        score.materialDynamicsDimensionScore,
      ),
      spatialDynamicsDimensionScore: decimalToNumber(
        score.spatialDynamicsDimensionScore,
      ),
      year: score.year,
      countryId: score.countryId,
      country: {
        id: score.country.id,
        cnName: score.country.cnName,
        enName: score.country.enName,
        createTime: score.country.createTime,
        updateTime: score.country.updateTime,
      },
      createTime: score.createTime,
      updateTime: score.updateTime,
    };
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
   * @description 删除一个评分记录（物理删除）。
   * - 物理删除评分记录
   * - 连带删除相关的评分详情（自定义文案）
   * - 异步清理评分详情关联的图片
   * @param {DeleteScoreDto} params - 包含要删除的记录的 ID。
   * @returns {Promise<Score>} 已删除的评分记录。
   */
  async delete(params: DeleteScoreDto): Promise<Score> {
    const { id } = params;
    this.logger.log(`[开始] 删除评分记录 - 评分ID: ${id}`);

    try {
      // 1. 查找要删除的评分记录，以获取其年份和国家ID
      const scoreToDelete = await this.prisma.score.findFirst({
        where: { id, delete: 0 },
      });

      if (!scoreToDelete) {
        this.logger.warn(
          `[验证失败] 删除评分记录 - 评分ID ${id} 不存在或已被删除`,
        );
        throw new BusinessException(
          ErrorCode.RESOURCE_NOT_FOUND,
          `评分记录不存在或已被删除`,
        );
      }

      // 2. 查找并删除相关的评分详情（自定义文案）
      const relatedDetail = await this.prisma.scoreEvaluationDetail.findFirst({
        where: {
          year: scoreToDelete.year,
          countryId: scoreToDelete.countryId,
          delete: 0,
        },
      });

      let deletedDetailImages: string[] = [];
      if (relatedDetail) {
        // 物理删除评分详情
        const deletedDetail = await this.prisma.scoreEvaluationDetail.delete({
          where: { id: relatedDetail.id },
        });
        deletedDetailImages = (deletedDetail.images as string[]) || [];
        this.logger.log(
          `[关联删除] 删除评分详情 - 年份: ${scoreToDelete.year}, 国家ID: ${scoreToDelete.countryId}`,
        );
      }

      // 3. 物理删除评分记录
      const deletedScore = await this.prisma.score.delete({
        where: { id },
      });

      // 4. 异步清理评分详情关联的图片（如果存在）
      if (deletedDetailImages.length > 0) {
        ImageProcessorUtils.cleanupImagesAsync(
          this.uploadService,
          this.logger,
          deletedDetailImages,
          '删除评分记录后的关联评分详情图片清理',
        );
      }

      this.logger.log(
        `[成功] 删除评分记录 - 评分ID: ${id}, 年份: ${deletedScore.year}, 国家ID: ${deletedScore.countryId}`,
      );
      return deletedScore;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      this.logger.error(
        `[失败] 删除评分记录 - ${error instanceof Error ? error.message : '未知错误'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * @description 获取所有评分评价规则。
   * @returns {Promise<ScoreEvaluationResponseDto[]>} 按最小评分升序排列的评价规则列表。
   */
  async listEvaluation(): Promise<ScoreEvaluationResponseDto[]> {
    const evaluations = await this.prisma.scoreEvaluation.findMany({
      orderBy: {
        minScore: 'asc', // 按最小评分升序排序
      },
    });

    // 将 Prisma Decimal 转换为 number 类型
    return evaluations.map((evaluation) => ({
      id: evaluation.id,
      minScore: decimalToNumber(evaluation.minScore),
      maxScore: decimalToNumber(evaluation.maxScore),
      evaluationText: evaluation.evaluationText,
      images: evaluation.images as string[],
      createTime: evaluation.createTime,
      updateTime: evaluation.updateTime,
    }));
  }

  /**
   * @description 批量创建评分评价规则，此操作会先清空所有现有规则。
   * @param {ScoreEvaluationItemDto[]} data - 新的评分评价规则数组。
   * @returns {Promise<Prisma.BatchPayload>} 创建操作的结果。
   */
  async createEvaluation(data: ScoreEvaluationItemDto[]) {
    // 1. 先收集现有评价规则的所有图片，避免产生孤立图片
    const existingEvaluations = await this.prisma.scoreEvaluation.findMany({
      select: { images: true },
    });

    // 收集所有现有图片
    const existingImages = existingEvaluations.flatMap(
      (evaluation) => (evaluation.images as string[]) || [],
    );

    // 2. 删除所有现有的评价规则
    await this.prisma.scoreEvaluation.deleteMany({});

    // 3. 使用工具类处理每个评价规则的图片数据
    const { processedData, allDeletedImages } =
      ImageProcessorUtils.processEvaluationImages(data);

    // 4. 收集新规则中使用的图片
    const newImages = processedData.flatMap(
      (item) => (item.images as string[]) || [],
    );

    // 5. 计算真正需要删除的图片：现有图片中不在新图片中的
    const imagesToDelete = existingImages.filter(
      (img) => !newImages.includes(img),
    );

    // 6. 合并需要删除的图片：孤立图片 + 新规则中标记删除的图片
    const allImagesToDelete = [...imagesToDelete, ...allDeletedImages];

    // 7. 批量创建新的评价规则
    const result = await this.prisma.scoreEvaluation.createMany({
      data: processedData,
    });

    // 8. 异步清理不再使用的图片，不阻塞主流程
    if (allImagesToDelete.length > 0) {
      ImageProcessorUtils.cleanupImagesAsync(
        this.uploadService,
        this.logger,
        allImagesToDelete,
        '评价规则更新，图片清理',
      );
    }

    return result;
  }

  /**
   * @description 根据多个年份获取该年份下存在评分数据的国家列表
   */
  async getCountriesByYears(
    params: DataManagementCountriesByYearsReqDto,
  ): Promise<DataManagementCountriesByYearsResDto> {
    const result: DataManagementCountriesByYearsResDto = [];
    for (const year of params.years) {
      const countries = await this.prisma.score.findMany({
        where: {
          year,
          delete: 0,
          country: { delete: 0 },
        },
        select: {
          country: {
            select: { id: true, cnName: true, enName: true },
          },
        },
        distinct: ['countryId'],
        orderBy: { country: { cnName: 'asc' } },
      });
      result.push({
        year,
        countries: countries.map((c) => ({
          id: c.country.id,
          cnName: c.country.cnName,
          enName: c.country.enName,
        })),
      });
    }
    return result;
  }

  /**
   * @description 导出多个年份和多个国家的评分数据
   */
  async exportDataMultiYear(
    params: ExportDataMultiYearReqDto,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    const { yearCountryPairs, format } = params;
    // 拿到涉及国家
    const allCountryIds = yearCountryPairs.flatMap((p) => p.countryIds);
    const uniqueCountryIds = [...new Set(allCountryIds)];
    const countries = await this.prisma.country.findMany({
      where: { id: { in: uniqueCountryIds }, delete: 0 },
    });
    const countryMap = new Map(countries.map((c) => [c.id, c]));

    // 取出对应年份国家的评分记录
    const orConds = yearCountryPairs.flatMap((p) =>
      p.countryIds.map((cid) => ({ year: p.year, countryId: cid })),
    );
    const scores = await this.prisma.score.findMany({
      where: { OR: orConds, delete: 0 },
    });
    // 按 key(year-countryId) 建索引
    const keyToScore = new Map<string, (typeof scores)[0]>();
    scores.forEach((s) => keyToScore.set(`${s.year}-${s.countryId}`, s));

    // 生成格式
    if (format === ExportFormat.JSON) {
      const json: { [key: string]: any[] } = {};
      yearCountryPairs.forEach(({ year, countryIds }) => {
        const rows: any[] = [];
        countryIds.forEach((cid) => {
          const country = countryMap.get(cid);
          if (!country) return;
          const s = keyToScore.get(`${year}-${cid}`);
          rows.push({
            国家: country.cnName,
            综合评分: s ? decimalToNumber(s.totalScore) : null,
            城镇化进程: s
              ? decimalToNumber(s.urbanizationProcessDimensionScore)
              : null,
            人口迁徙动力: s
              ? decimalToNumber(s.humanDynamicsDimensionScore)
              : null,
            经济发展动力: s
              ? decimalToNumber(s.materialDynamicsDimensionScore)
              : null,
            空间发展动力: s
              ? decimalToNumber(s.spatialDynamicsDimensionScore)
              : null,
          });
        });
        json[`${year}年`] = rows;
      });
      const buffer = Buffer.from(JSON.stringify(json, null, 2));
      const mime = 'application/json';
      const fileName = `多年份评分数据_${new Date()
        .toISOString()
        .replace(/[:T-Z.]/g, '_')}.json`;
      return { buffer, mime, fileName };
    }

    // 表头（统一）
    const header = [
      '国家',
      '综合评分',
      '城镇化进程',
      '人口迁徙动力',
      '经济发展动力',
      '空间发展动力',
    ];

    // 使用 xlsx 生成 CSV/XLSX
    if (format === ExportFormat.CSV) {
      // CSV 仅导出第一个年份
      const first = yearCountryPairs[0];
      const rows: (string | number | null)[][] = [];
      first.countryIds.forEach((cid) => {
        const country = countryMap.get(cid);
        if (!country) return;
        const s = keyToScore.get(`${first.year}-${cid}`);
        rows.push([
          country.cnName,
          s ? decimalToNumber(s.totalScore) : null,
          s ? decimalToNumber(s.urbanizationProcessDimensionScore) : null,
          s ? decimalToNumber(s.humanDynamicsDimensionScore) : null,
          s ? decimalToNumber(s.materialDynamicsDimensionScore) : null,
          s ? decimalToNumber(s.spatialDynamicsDimensionScore) : null,
        ]);
      });
      const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
      const csv = xlsx.utils.sheet_to_csv(ws);
      const bom = Buffer.from([0xef, 0xbb, 0xbf]);
      const buffer = Buffer.concat([bom, Buffer.from(csv)]);
      const mime = 'text/csv;charset=utf-8;';
      const fileName = `${first.year}_评分数据_${new Date()
        .toISOString()
        .replace(/[:T-Z.]/g, '_')}.csv`;
      return { buffer, mime, fileName };
    }

    // XLSX: 为每个年份一个 sheet
    const wb = xlsx.utils.book_new();
    yearCountryPairs.forEach(({ year, countryIds }) => {
      const rows: (string | number | null)[][] = [];
      countryIds.forEach((cid) => {
        const country = countryMap.get(cid);
        if (!country) return;
        const s = keyToScore.get(`${year}-${cid}`);
        rows.push([
          country.cnName,
          s ? decimalToNumber(s.totalScore) : null,
          s ? decimalToNumber(s.urbanizationProcessDimensionScore) : null,
          s ? decimalToNumber(s.humanDynamicsDimensionScore) : null,
          s ? decimalToNumber(s.materialDynamicsDimensionScore) : null,
          s ? decimalToNumber(s.spatialDynamicsDimensionScore) : null,
        ]);
      });
      const ws = xlsx.utils.aoa_to_sheet([header, ...rows]);
      xlsx.utils.book_append_sheet(wb, ws, `${year}年`);
    });
    const buffer = xlsx.write(wb, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer;
    const mime =
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = `评分数据_${new Date().toISOString().replace(/[:T-Z.]/g, '_')}.xlsx`;
    return { buffer, mime, fileName };
  }
}
