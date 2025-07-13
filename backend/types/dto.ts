import {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
} from '@prisma/client';

export {
  TopIndicator,
  SecondaryIndicator,
  DetailedIndicator,
  Continent,
  Country,
};

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
 * 详细指标数据项
 */
export type DetailedIndicatorItem = {
  id: string; // 指标ID
  cnName: string; // 指标中文名称
  enName: string; // 指标英文名称
  unit: string; // 单位
  value: number | null; // 指标值，可能为空
};

/**
 * 二级指标项及其包含的三级指标
 */
export type SecondaryIndicatorItem = {
  id: string; // 二级指标ID
  cnName: string; // 二级指标中文名称
  enName: string; // 二级指标英文名称
  detailedIndicators: DetailedIndicatorItem[]; // 包含的三级指标
};

/**
 * 一级指标项及其包含的二级指标
 */
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
  cnName: string; // 国家中文名
  enName: string; // 国家英文名
  year: Date; // 年份
  indicators: TopIndicatorItem[]; // 一级指标数据列表
  isComplete: boolean; // 数据是否完整
};

/**
 * 查询指标请求参数 - 用于一级和二级指标查询
 */
export type QueryIndicatorReqDto = {
  includeChildren?: boolean; // 是否包含子指标，默认为false
};

/**
 * 三级指标响应项
 */
export type DetailedIndicatorDto = DetailedIndicator;

/**
 * 二级指标响应项
 */
export type SecondaryIndicatorDto = SecondaryIndicator & {
  detailedIndicators?: DetailedIndicatorDto[];
};

/**
 * 一级指标响应项
 */
export type TopIndicatorDto = TopIndicator & {
  secondaryIndicators?: SecondaryIndicatorDto[];
};

/**
 * 一级指标查询响应
 */
export type TopIndicatorListResDto = TopIndicatorDto[];

/**
 * 二级指标查询响应
 */
export type SecondaryIndicatorListResDto = SecondaryIndicatorDto[];

/**
 * 三级指标查询响应
 */
export type DetailedIndicatorListResDto = DetailedIndicatorDto[];

/**
 * 国家DTO
 */
export type CountryDto = Country;

/**
 * 包含国家列表的大洲DTO
 */
export type ContinentWithCountriesDto = Continent & {
  Country?: CountryDto[];
};

/**
 * 大洲DTO
 */
export type ContinentDto = Continent;

/**
 * 查询大洲请求参数
 */
export type QueryContinentReqDto = {
  includeCountries?: boolean; // 是否包含国家，默认为false
};

/**
 * 查询国家请求参数
 */
export type QueryCountryReqDto = {
  continentId?: string; // 可选的大洲ID，如果提供则筛选该大洲下的国家
  includeContinent?: boolean; // 是否包含大洲信息，默认为false
};

/**
 * 包含大洲信息的国家DTO
 */
export type CountryWithContinentDto = Country & {
  continent?: ContinentDto;
};

/**
 * 大洲查询响应
 */
export type ContinentListResDto = ContinentWithCountriesDto[];

/**
 * 国家查询响应
 */
export type CountryListResDto = CountryWithContinentDto[];
