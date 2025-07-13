/* 所有需要用到的类型都放在这里 并按照业务逻辑分类 */
import {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
} from '@prisma/client';

// 导出Prisma模型类型
export {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
};

/*
 * ==================== 数据管理模块 ====================
 */

/**
 * 数据管理列表相关类型
 */
export type DataManagementListItem = {
  year: Date;
};

export type IndicatorValue = {
  cnName: string;
  enName: string;
  value: number | null;
};

export type CountryData = {
  id: string;
  cnName: string;
  enName: string;
  year: Date;
  isComplete: boolean; // 69个三级指标中是否包含null字段，如果包含null字段，则isComplete为false，否则为true
  createTime: Date; // 所有该年该国家下数据最早的时间作为创建时间
  updateTime: Date; // 所有该年该国家下数据最晚的时间作为更新时间
};

export type YearData = {
  year: Date;
  data: CountryData[];
};

export type DataManagementListDto = YearData[];

/**
 * 国家详细指标数据请求参数
 */
export type CountryDetailReqDto = {
  countryId: string; // 国家ID
  year: Date; // 年份
};

/**
 * 指标层级结构类型
 */
export type DetailedIndicatorItem = {
  id: string; // 指标ID
  cnName: string; // 指标中文名称
  enName: string; // 指标英文名称
  unit: string; // 单位
  value: number | null; // 指标值，可能为空
};

export type SecondaryIndicatorItem = {
  id: string; // 二级指标ID
  cnName: string; // 二级指标中文名称
  enName: string; // 二级指标英文名称
  detailedIndicators: DetailedIndicatorItem[]; // 包含的三级指标
};

export type TopIndicatorItem = {
  id: string; // 一级指标ID
  cnName: string; // 一级指标中文名称
  enName: string; // 一级指标英文名称
  secondaryIndicators: SecondaryIndicatorItem[]; // 包含的二级指标
};

/**
 * 国家详细指标数据响应 - 层次结构
 */
export type CountryDetailResDto = {
  countryId: string; // 国家ID
  year: Date; // 年份
  indicators: TopIndicatorItem[]; // 一级指标数据列表
  isComplete: boolean; // 数据是否完整
};

/**
 * 创建或更新指标值相关类型
 */
export type IndicatorValueItem = {
  detailedIndicatorId: string; // 三级指标ID
  value: number | null; // 指标值，允许为null
};

export type CreateIndicatorValuesDto = {
  countryId: string; // 国家ID
  year: Date; // 年份
  indicators: IndicatorValueItem[]; // 指标值数组
};

/**
 * 检查数据是否存在相关类型
 */
export type CountryYearQueryDto = {
  countryId: string; // 国家ID
  year: Date; // 年份
};

export type CheckExistingDataResDto = {
  exists: boolean; // 是否存在数据
  count: number; // 存在的指标值数量
};

/**
 * 导出数据相关类型
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json',
}

/**
 * 导出格式选项 - 用于前端渲染
 */
export const ExportFormatOptions = [
  { value: ExportFormat.CSV, label: 'CSV' },
  { value: ExportFormat.XLSX, label: 'XLSX (Excel)' },
  { value: ExportFormat.JSON, label: 'JSON' },
];

export type ExportDataReqDto = {
  year: Date; // 年份
  countryIds: string[]; // 国家ID数组
  format: ExportFormat; // 导出格式
};

/*
 * ==================== 指标管理模块 ====================
 */

/**
 * 查询指标请求参数 - 用于一级和二级指标查询
 */
export type QueryIndicatorReqDto = {
  includeChildren?: boolean; // 是否包含子指标，默认为false
};

/**
 * 指标查询响应类型
 */
export type DetailedIndicatorDto = DetailedIndicator & {
  SecondaryIndicator?: SecondaryIndicator & {
    topIndicator?: TopIndicator;
  };
};

/**
 * 统一指标层级结构响应DTO
 */
export type IndicatorHierarchyResDto = TopIndicatorItem[];

/*
 * ==================== 国家和大洲管理模块 ====================
 */

/**
 * 国家和大洲DTO类型
 */
export type CountryDto = Country;
export type ContinentDto = Continent;

export type ContinentWithCountriesDto = Continent & {
  Country?: CountryDto[];
};

export type CountryWithContinentDto = Country & {
  continent?: ContinentDto;
};

/**
 * 查询参数类型
 */
export type QueryContinentReqDto = {
  includeCountries?: boolean; // 是否包含国家，默认为false
};

export type QueryCountryReqDto = {
  continentId?: string; // 可选的大洲ID，如果提供则筛选该大洲下的国家
  includeContinent?: boolean; // 是否包含大洲信息，默认为false
};

/**
 * 查询响应类型
 */
export type ContinentListResDto = ContinentWithCountriesDto[];
export type CountryListResDto = CountryWithContinentDto[];
