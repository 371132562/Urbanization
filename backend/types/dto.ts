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
  year: number;
};

export type IndicatorValue = {
  cnName: string;
  enName: string;
  value: number | null;
};

export type IndicatorDataItem = {
  id: string; // detailedIndicatorId
  cnName: string;
  enName: string;
  value: number | null;
};

export type CountryData = {
  id: string;
  cnName: string;
  enName: string;
  year: number;
  isComplete: boolean; // 69个三级指标中是否包含null字段，如果包含null字段，则isComplete为false，否则为true
  indicators: IndicatorDataItem[];
  createTime: Date; // 所有该年该国家下数据最早的时间作为创建时间
  updateTime: Date; // 所有该年该国家下数据最晚的时间作为更新时间
};

export type YearData = {
  year: number;
  data: CountryData[];
};

export type DataManagementListDto = YearData[];

/**
 * 分页信息类型
 */
export type PaginationInfo = {
  page: number; // 当前页码，从1开始
  pageSize: number; // 每页数量
  total: number; // 总数量
  totalPages: number; // 总页数
};

/**
 * 带分页的年份数据类型
 */
export type PaginatedYearData = {
  year: number;
  data: CountryData[];
  pagination: PaginationInfo;
};

/**
 * 数据管理列表请求参数（支持分页）
 */
export type DataManagementListReqDto = {
  searchTerm?: string; // 搜索关键词，用于按国家名称搜索
  yearPaginations?: {
    year: number;
    page?: number; // 默认为1
    pageSize?: number; // 默认为10
  }[];
};

/**
 * 数据管理列表响应（支持分页）
 */
export type DataManagementListResDto = PaginatedYearData[];

/**
 * 国家详细指标数据请求参数
 */
export type CountryDetailReqDto = {
  countryId: string; // 国家ID
  year: number; // 年份
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
  weight: number; // 权重
};

export type SecondaryIndicatorItem = {
  id: string; // 二级指标ID
  cnName: string; // 二级指标中文名称
  enName: string; // 二级指标英文名称
  detailedIndicators: DetailedIndicatorItem[]; // 包含的三级指标
  weight: number; // 权重
};

export type TopIndicatorItem = {
  id: string; // 一级指标ID
  cnName: string; // 一级指标中文名称
  enName: string; // 一级指标英文名称
  secondaryIndicators: SecondaryIndicatorItem[]; // 包含的二级指标
  weight: number; // 权重
};

/**
 * 国家详细指标数据响应 - 层次结构
 */
export type CountryDetailResDto = {
  countryId: string; // 国家ID
  year: number; // 年份
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
  year: number; // 年份
  indicators: IndicatorValueItem[]; // 指标值数组
};

/**
 * 批量创建指标值数据请求参数
 */
export type BatchCreateIndicatorValuesDto = {
  year: number; // 年份
  countries: {
    countryId: string; // 国家ID
    indicators: IndicatorValueItem[]; // 指标值数组
  }[];
};

/**
 * 批量检查指标数据是否存在请求参数
 */
export type BatchCheckIndicatorExistingDto = {
  year: number; // 年份
  countryIds: string[]; // 国家ID数组
};

/**
 * 批量检查指标数据是否存在响应结果
 */
export type BatchCheckIndicatorExistingResDto = {
  totalCount: number; // 总检查数量
  existingCount: number; // 已存在数量
  existingCountries: string[]; // 已存在的国家ID列表
  nonExistingCountries: string[]; // 不存在的国家ID列表
};

/**
 * 检查数据是否存在相关类型
 */
export type CountryYearQueryDto = {
  countryId: string; // 国家ID
  year: number; // 年份
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

/**
 * 多年份导出数据请求参数
 */
export type ExportDataMultiYearReqDto = {
  yearCountryPairs: Array<{
    year: number; // 年份
    countryIds: string[]; // 该年份下的国家ID数组
  }>;
  format: ExportFormat; // 导出格式
};

/**
 * 获取有数据的年份列表响应类型
 */
export type DataManagementYearsResDto = number[];

/**
 * 根据多个年份获取国家列表请求参数
 */
export type DataManagementCountriesByYearsReqDto = {
  years: number[]; // 年份数组
};

/**
 * 简化的国家数据类型（仅用于导出页面的下拉选择）
 */
export type SimpleCountryData = {
  id: string; // 国家ID
  cnName: string; // 中文名称
  enName: string; // 英文名称
};

/**
 * 按年份分组的国家列表响应类型
 */
export type DataManagementCountriesByYearsResDto = Array<{
  year: number;
  countries: SimpleCountryData[];
}>;

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

/**
 * 更新指标权重 DTO
 */
export type UpdateIndicatorWeightItemDto = {
  id: string; // 指标ID
  level: 'top' | 'secondary' | 'detailed'; // 指标层级
  weight: number; // 新的权重值
};

export type UpdateWeightsDto = {
  weights: UpdateIndicatorWeightItemDto[];
};

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
  images: string[]; // 文章内包含的图片 为图片id组成的数组
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
 * @description 创建新文章时使用的数据传输对象 (DTO)
 */
export type CreateArticleDto = {
  title: string;
  content: string;
  images: string[];
  deletedImages: string[];
};

/**
 * @description 更新现有文章时使用的数据传输对象 (DTO)
 */
export type UpdateArticleDto = {
  id: string;
  title?: string;
  content?: string;
  images: string[];
  deletedImages: string[];
};

/**
 * 文章元数据 - 用于列表，不包含文章内容
 */
export type ArticleMetaItem = Omit<ArticleItem, 'content' | 'images'>;

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
  year: number;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
};

/**
 * 批量创建评分数据请求参数
 */
export type BatchCreateScoreDto = {
  year: number; // 年份
  scores: {
    countryId: string; // 国家ID
    totalScore: number;
    urbanizationProcessDimensionScore: number;
    humanDynamicsDimensionScore: number;
    materialDynamicsDimensionScore: number;
    spatialDynamicsDimensionScore: number;
  }[];
};

/**
 * 批量检查评分数据是否存在请求参数
 */
export type BatchCheckScoreExistingDto = {
  year: number; // 年份
  countryIds: string[]; // 国家ID数组
};

/**
 * 批量检查评分数据是否存在响应结果
 */
export type BatchCheckScoreExistingResDto = {
  totalCount: number; // 总检查数量
  existingCount: number; // 已存在数量
  existingCountries: string[]; // 已存在的国家ID列表
  nonExistingCountries: string[]; // 不存在的国家ID列表
};

export type ScoreDataItem = {
  id: string;
  countryId: string;
  cnName: string;
  enName: string;
  year: number;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
  createTime: Date;
  updateTime: Date;
};

/**
 * 评分列表请求参数（支持分页）
 */
export type ScoreListReqDto = {
  searchTerm?: string; // 搜索关键词，用于按国家名称搜索
  yearPaginations?: {
    year: number;
    page?: number; // 默认为1
    pageSize?: number; // 默认为10
  }[];
};

/**
 * 评分列表响应（支持分页）
 */
export type ScoreListResDto = PaginatedYearScoreData[];

/**
 * 分页年份评分数据
 */
export type PaginatedYearScoreData = {
  year: number;
  data: ScoreDataItem[];
  pagination: PaginationInfo;
};

export interface CountryScoreDataItem {
  year: number;
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
  year: number;
};

/**
 * 删除得分记录 DTO
 */
export type DeleteScoreDto = {
  id: string;
};

// 认证相关DTO类型
export type LoginDto = {
  code: string; // 用户编号
  password: string; // 密码
};

export type LoginResponseDto = {
  token: string; // JWT token
  user: {
    id: string;
    code: string;
    name: string;
    department: string;
    email?: string;
    phone?: string;
    roleId?: string;
    role?: {
      id: string;
      name: string;
      description?: string;
      allowedRoutes: string[];
    };
  };
};

export type TokenPayloadDto = {
  userId: string;
  userCode: string;
  userName: string;
  roleId?: string;
  roleName?: string;
  iat?: number;
  exp?: number;
};

export type RefreshTokenDto = {
  token: string;
};

export type ChangePasswordDto = {
  oldPassword: string;
  newPassword: string;
};

export type UserProfileDto = {
  id: string;
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  role?: {
    id: string;
    name: string;
    description?: string;
    allowedRoutes: string[];
  };
  createTime: Date;
  updateTime: Date;
};

/*
 * ==================== 角色管理模块 ====================
 */

/**
 * 角色列表项 DTO
 */
export type RoleListItemDto = {
  id: string;
  name: string;
  description?: string;
  allowedRoutes: string[];
  userCount: number;
  createTime: Date;
  updateTime: Date;
};

/**
 * 角色列表响应 DTO
 */
export type RoleListResDto = RoleListItemDto[];

/**
 * 创建角色 DTO
 */
export type CreateRoleDto = {
  name: string;
  description?: string;
  allowedRoutes: string[];
};

/**
 * 编辑角色 DTO
 */
export type UpdateRoleDto = {
  id: string;
  name?: string;
  description?: string;
  allowedRoutes?: string[];
};

/**
 * 删除角色 DTO
 */
export type DeleteRoleDto = {
  id: string;
};

/**
 * 分配角色菜单权限 DTO
 */
export type AssignRoleRoutesDto = {
  id: string;
  allowedRoutes: string[];
};

/*
 * ==================== 用户管理模块 ====================
 */

/**
 * 用户列表项 DTO
 */
export type UserListItemDto = {
  id: string;
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  roleId?: string;
  roleName?: string;
  createTime: Date;
  updateTime: Date;
};

/**
 * 用户列表响应 DTO
 */
export type UserListResDto = UserListItemDto[];

/**
 * 创建用户 DTO
 */
export type CreateUserDto = {
  code: string;
  name: string;
  department: string;
  email?: string;
  phone?: string;
  password: string;
  roleId?: string;
};

/**
 * 编辑用户 DTO
 */
export type UpdateUserDto = {
  id: string;
  name?: string;
  department?: string;
  email?: string;
  phone?: string;
  roleId?: string;
};

/**
 * 删除用户 DTO
 */
export type DeleteUserDto = {
  id: string;
};

/**
 * 重置用户密码 DTO
 */
export type ResetUserPasswordDto = {
  id: string;
  newPassword: string;
};
