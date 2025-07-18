import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import {
  ScoreEvaluationItemDto,
  CreateScoreDto,
  ScoreListDto,
  YearScoreData,
  ScoreDetailReqDto,
  DeleteScoreDto,
  CheckExistingDataResDto,
} from 'types/dto';
import * as dayjs from 'dayjs';
import { BusinessException } from '../../exceptions/businessException';
import { ErrorCode } from '../../../types/response';
import { Score, Country } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * @class ScoreService
 * @description 封装与得分和得分评价相关的业务逻辑
 */
@Injectable()
export class ScoreService {
  private readonly logger = new Logger(ScoreService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * @description 获取所有得分数据，并按年份进行分组。
   * @returns {Promise<ScoreListDto>} 按年份分组的得分数据。
   */
  async list(): Promise<ScoreListDto> {
    this.logger.log('开始从数据库获取所有得分数据。');

    // 1. 从数据库查询所有未被软删除的得分记录
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
      this.logger.log('未找到任何得分数据，返回空数组。');
      return [];
    }

    // 2. 使用 Map 按年份对数据进行分组
    //    - Key: 年份 (number)
    //    - Value: 当年的所有得分记录数组 (Score with Country)
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
        year: dayjs().year(year).startOf('year').toDate(), // 将年份数字转换为 Date 对象
        // 遍历当年的所有得分记录，并将其映射为 DTO 格式
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

    this.logger.log('得分数据处理完成。');
    return result;
  }

  /**
   * @description 创建或更新一个得分记录。如果给定国家和年份的记录已存在，则更新它；否则，创建新记录。
   * @param {CreateScoreDto} data - 创建或更新得分所需的数据。
   * @returns {Promise<Score>} 创建或更新后的得分记录。
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
    // 标准化年份为 Date 对象 (取年份的开始)
    const yearDate = dayjs(year).startOf('year').toDate();

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

    // 3. 检查该国家在该年份是否已存在得分记录
    const existingScore = await this.prisma.score.findFirst({
      where: {
        countryId,
        year: yearDate,
        delete: 0,
      },
    });

    // 4. 准备要写入数据库的得分数据
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
        `正在更新国家 ${countryId} 在 ${dayjs(year).year()} 年的得分记录。`,
      );
      return this.prisma.score.update({
        where: { id: existingScore.id },
        data: scoreData,
      });
    } else {
      // 如果记录不存在，则创建新记录
      this.logger.log(
        `正在为国家 ${countryId} 在 ${dayjs(year).year()} 年创建新的得分记录。`,
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
   * @description 获取特定国家和年份的得分详情。
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year。
   * @returns {Promise<Score>} 得分详情记录。
   */
  async detail(params: ScoreDetailReqDto): Promise<Score> {
    const { countryId, year } = params;
    const yearDate = dayjs(year).startOf('year').toDate(); // 标准化年份

    // 查询特定国家和年份的得分记录
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
        `未找到国家 ID ${countryId} 在 ${dayjs(year).year()} 年的得分记录`,
      );
    }
    return score;
  }

  /**
   * @description 检查特定国家和年份的得分数据是否存在.
   * @param {ScoreDetailReqDto} params - 包含 countryId 和 year.
   * @returns {Promise<CheckExistingDataResDto>} 包含存在状态和计数的对象.
   */
  async checkExistingData(
    params: ScoreDetailReqDto,
  ): Promise<CheckExistingDataResDto> {
    const { countryId, year } = params;
    const yearDate = dayjs(year).startOf('year').toDate();

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
   * @description 删除一个得分记录（软删除）。
   * @param {DeleteScoreDto} params - 包含要删除的记录的 ID。
   * @returns {Promise<Score>} 已更新的得分记录（标记为已删除）。
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
        `未找到 ID 为 ${id} 的得分记录`,
      );
    }

    // 2. 执行软删除操作（将 delete 字段更新为 1）
    return this.prisma.score.update({
      where: { id },
      data: { delete: 1 },
    });
  }

  /**
   * @description 获取所有得分评价规则。
   * @returns {Promise<ScoreEvaluation[]>} 按最小得分升序排列的评价规则列表。
   */
  findAllEvaluations() {
    return this.prisma.scoreEvaluation.findMany({
      orderBy: {
        minScore: 'asc', // 按最小得分升序排序
      },
    });
  }

  /**
   * @description 批量创建得分评价规则，此操作会先清空所有现有规则。
   * @param {ScoreEvaluationItemDto[]} data - 新的得分评价规则数组。
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
