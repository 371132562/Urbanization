import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
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
} from '../../../types/dto';
import { IndicatorValue, Country } from '@prisma/client';
import * as dayjs from 'dayjs';
import * as xlsx from 'xlsx';

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
      where: {
        delete: 0,
        country: {
          delete: 0,
        },
      },
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

    // 按年份降序排序，最新的年份在前
    this.logger.log('指标数据处理完成并按年份排序。');
    return result.sort((a, b) => b.year.getTime() - a.year.getTime());
  }

  /**
   * 创建或更新指标值数据
   * @param data 创建指标值的请求数据
   * @returns 创建或更新的指标值数量
   */
  async create(data: CreateIndicatorValuesDto): Promise<{ count: number }> {
    // 步骤1: 准备参数和基础数据
    const { countryId, year, indicators } = data;
    // 统一使用dayjs处理年份，只保留年份信息
    const yearDate = dayjs(year).startOf('year').toDate();
    const yearValue = dayjs(yearDate).year();

    this.logger.log(
      `准备为国家ID ${countryId} 在 ${yearValue} 年创建/更新 ${indicators.length} 个指标值`,
    );

    // 步骤2: 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new NotFoundException(`未找到ID为 ${countryId} 的国家`);
    }

    // 步骤3: 检查该国家该年份是否已有数据
    const existingCount = await this.prisma.indicatorValue.count({
      where: {
        countryId,
        year: yearDate,
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
        year: yearDate,
        value: processedValue,
        createTime: new Date(),
        updateTime: new Date(),
      };
    });

    // 步骤5: 执行数据库操作
    const result = await this.prisma.$transaction(async (prisma) => {
      let count = 0;

      // 如果已存在数据，先删除所有现有数据
      if (existingCount > 0) {
        await prisma.indicatorValue.updateMany({
          where: {
            countryId,
            year: yearDate,
            delete: 0,
          },
          data: {
            delete: 1,
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
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
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
        delete: 0,
        detailedIndicator: {
          delete: 0,
        },
      },
      include: { detailedIndicator: true },
    });

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

    // 步骤7: 构建并返回响应数据
    return {
      countryId: country.id,
      year: yearDate,
      indicators:
        topIndicators.size > 0 ? Array.from(topIndicators.values()) : [],
      isComplete,
    };
  }

  /**
   * 删除特定国家和年份的指标数据（逻辑删除）
   * @param params 删除参数，包含国家ID和年份
   * @returns 删除的记录数
   */
  async delete(params: CountryYearQueryDto): Promise<{ count: number }> {
    const { countryId, year } = params;
    // 统一使用dayjs处理年份，只保留年份信息
    const yearDate = dayjs(year).startOf('year').toDate();
    const yearValue = dayjs(yearDate).year();

    this.logger.log(`准备删除国家ID ${countryId} 在 ${yearValue} 年的指标数据`);

    // 1. 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new NotFoundException(`未找到ID为 ${countryId} 的国家`);
    }

    // 2. 执行逻辑删除
    const result = await this.prisma.indicatorValue.updateMany({
      where: {
        countryId,
        year: yearDate,
        delete: 0, // 只删除未被删除的记录
      },
      data: {
        delete: 1, // 设置删除标记
        updateTime: new Date(),
      },
    });

    this.logger.log(
      `成功为国家 ${country.cnName} 在 ${yearValue} 年删除了 ${result.count} 条指标数据`,
    );

    return { count: result.count };
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
    // 统一使用dayjs处理年份，只保留年份信息
    const yearDate = dayjs(year).startOf('year').toDate();
    const yearValue = dayjs(yearDate).year();

    this.logger.log(
      `检查国家ID ${countryId} 在 ${yearValue} 年是否已有指标数据`,
    );

    // 验证国家是否存在
    const country = await this.prisma.country.findFirst({
      where: { id: countryId, delete: 0 },
    });

    if (!country) {
      this.logger.error(`未找到ID为 ${countryId} 的国家`);
      throw new NotFoundException(`未找到ID为 ${countryId} 的国家`);
    }

    // 查询该国家该年份的指标值数量
    const count = await this.prisma.indicatorValue.count({
      where: {
        countryId,
        year: yearDate,
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
   * 导出特定年份和多个国家的数据
   * @param params 导出参数，包含年份、国家ID数组和格式
   * @returns 包含文件Buffer、MIME类型和文件名的对象
   */
  async exportData(
    params: ExportDataReqDto,
  ): Promise<{ buffer: Buffer; mime: string; fileName: string }> {
    const { year, countryIds, format } = params;
    const yearDate = dayjs(year).startOf('year').toDate();
    const yearValue = dayjs(yearDate).year();

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
    const values = await this.prisma.indicatorValue.findMany({
      where: {
        countryId: { in: countryIds },
        year: yearDate,
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
        // 将Decimal类型转为number
        valuesMap
          .get(value.countryId)!
          .set(value.detailedIndicatorId, value.value.toNumber());
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
