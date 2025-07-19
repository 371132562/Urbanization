/* 所有需要用到的类型都放在这里 并按照业务逻辑分类 */
import {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
  Article,
} from '@prisma/client';

// 导出Prisma模型类型
export {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
  Article,
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

/**
 * 世界地图城镇化数据响应DTO
 */
export type UrbanizationWorldMapDataItem = {
  id: string;
  countryId: string;
  urbanization: boolean;
  createTime: Date;
  updateTime: Date;
  country: {
    cnName: string;
    enName: string;
    continent: {
      id: string;
      cnName: string;
      enName: string;
    };
  };
};

export type UrbanizationWorldMapDataDto = UrbanizationWorldMapDataItem[];

/**
 * 批量更新国家城镇化状态 DTO
 */
export type UrbanizationUpdateDto = {
  countryId: string;
  urbanization: boolean;
};

/*
 * ==================== 文章管理模块 ====================
 */

/**
 * 文章列表查询参数
 */
export type ArticleListDto = {
  page?: number;
  pageSize?: number;
  title?: string;
};

/**
 * 文章列表返回 DTO
 */
export type ArticleItem = {
  id: string;
  title: string;
  content: string;
  createTime: Date;
  updateTime: Date;
};

export type ArticleListResponse = {
  list: ArticleMetaItem[];
  total: number;
  page: number;
  pageSize: number;
};

/**
 * 创建文章 DTO
 */
export type CreateArticleDto = {
  title: string;
  content: string;
};

/**
 * 更新文章 DTO
 */
export type UpdateArticleDto = {
  id: string;
  title?: string;
  content?: string;
};

/**
 * 文章元信息 DTO (不含content)
 */
export type ArticleMetaItem = Omit<ArticleItem, 'content'>;

/**
 * 删除文章 DTO
 */
export type DeleteArticleDto = {
  id: string;
};

/**
 * 创建/更新文章顺序 DTO
 */
export type UpsertArticleOrderDto = {
  page: string;
  articles: string[]; // 文章ID数组
};

/**
 * 文章顺序 DTO
 */
export type ArticleOrderDto = {
  id: string;
  page: string;
  articles: string[];
  createTime: Date;
  updateTime: Date;
};

/*
 * ==================== 得分评价模块 ====================
 */
export type ScoreEvaluationItemDto = {
  minScore: number;
  maxScore: number;
  evaluationText: string;
};

/**
 * 得分创建 DTO
 */
export type CreateScoreDto = {
  countryId: string;
  year: Date;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
};

export type ScoreDataItem = {
  id: string;
  countryId: string;
  cnName: string;
  enName: string;
  year: Date;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
  createTime: Date;
  updateTime: Date;
};

/**
 * 得分列表按年份分组
 */
export type YearScoreData = {
  year: Date;
  data: ScoreDataItem[];
};

export type ScoreListDto = YearScoreData[];

export interface CountryScoreDataItem {
  id: string;
  year: Date;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
  createTime: Date;
  updateTime: Date;
}

/**
 * 得分列表按国家分组
 */
export interface CountryScoreData {
  countryId: string;
  cnName: string;
  enName: string;
  data: CountryScoreDataItem[];
}

/**
 * 得分详情查询 DTO
 */
export type ScoreDetailReqDto = {
  countryId: string;
  year: Date;
};

/**
 * 删除得分记录 DTO
 */
export type DeleteScoreDto = {
  id: string;
};
