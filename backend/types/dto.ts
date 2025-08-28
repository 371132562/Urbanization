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
 * 单年份数据管理列表请求参数（支持分页）
 */
export type DataManagementListByYearReqDto = {
  year: number; // 年份
  page?: number; // 默认为1
  pageSize?: number; // 默认为10
  searchTerm?: string; // 搜索关键词
  sortField?: string; // 排序字段名
  sortOrder?: 'asc' | 'desc'; // 排序方向
};

/**
 * 单年份数据管理列表响应（支持分页）
 */
export type DataManagementListByYearResDto = PaginatedYearData;

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
  type: string; // 文章类型
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
  images?: string[]; // 评价体系内包含的图片，为图片id组成的数组
  deletedImages?: string[]; // 已删除的图片列表
};

/**
 * 评价详情（自定义文案）列表项：用于“评价详情管理”列表页
 * 与“评分详情（ScoreDetail）”不同，此处仅包含综合评分、匹配到的评价规则文案，以及是否存在自定义详情
 */
export type ScoreEvaluationDetailListItemDto = {
  id: string; // score表主键ID
  countryId: string;
  cnName: string;
  enName: string;
  year: number;
  totalScore: number;
  matchedText: string; // 根据评价体系匹配到的文案
  hasCustomDetail: boolean; // 是否存在自定义评价详情
  createTime: Date;
  updateTime: Date;
};

/**
 * 单年份评价详情（自定义文案）列表请求参数（支持分页和搜索，不需要排序）
 */
export type ScoreEvaluationDetailListByYearReqDto = {
  year: number;
  page?: number;
  pageSize?: number;
  searchTerm?: string; // 国家中英文名搜索
};

/**
 * 单年份评价详情（自定义文案）列表响应（支持分页）
 */
export type ScoreEvaluationDetailListByYearResDto = {
  year: number;
  data: ScoreEvaluationDetailListItemDto[];
  pagination: PaginationInfo;
};

/**
 * 评价详情（自定义文案）编辑获取请求
 */
export type ScoreEvaluationDetailGetReqDto = {
  year: number;
  countryId: string;
};

/**
 * 评价详情（自定义文案）编辑数据
 */
export type ScoreEvaluationDetailEditResDto = {
  id?: string;
  year: number;
  countryId: string;
  text: string;
  images: string[];
  createTime?: Date;
  updateTime?: Date;
};

/**
 * 评价详情（自定义文案）保存/更新 DTO
 */
export type UpsertScoreEvaluationDetailDto = {
  year: number;
  countryId: string;
  text: string;
  images: string[];
  deletedImages: string[];
};

/**
 * 评分评价规则响应 DTO
 * 包含从 Prisma Decimal 转换后的 number 类型分数
 */
export type ScoreEvaluationResponseDto = {
  id: string;
  minScore: number;
  maxScore: number;
  evaluationText: string;
  images: string[];
  createTime: Date;
  updateTime: Date;
};

/**
 * 评分详情响应 DTO
 * 包含从 Prisma Decimal 转换后的 number 类型分数
 */
export type ScoreDetailResponseDto = {
  id: string;
  totalScore: number;
  urbanizationProcessDimensionScore: number;
  humanDynamicsDimensionScore: number;
  materialDynamicsDimensionScore: number;
  spatialDynamicsDimensionScore: number;
  year: number;
  countryId: string;
  country: {
    id: string;
    cnName: string;
    enName: string;
    createTime: Date;
    updateTime: Date;
  };
  createTime: Date;
  updateTime: Date;
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
 * 分页年份评分数据
 */
export type PaginatedYearScoreData = {
  year: number;
  data: ScoreDataItem[];
  pagination: PaginationInfo;
};

/**
 * 单年份评分列表请求参数（支持分页和排序）
 */
export type ScoreListByYearReqDto = {
  year: number;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
};

/**
 * 单年份评分列表响应（支持分页）
 */
export type ScoreListByYearResDto = PaginatedYearScoreData;

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

/*
 * ==================== 系统日志模块 ====================
 * 系统日志模块提供系统级别和用户级别的日志查看功能
 * 支持按级别过滤、关键词搜索、分页显示等特性
 */

/**
 * 日志级别枚举
 * - 'info': 信息级别日志
 * - 'error': 错误级别日志
 * - 'all': 所有级别日志（用于查询时不过滤级别）
 */
export type LogLevel = 'info' | 'error' | 'all';

/**
 * 日志文件级别枚举
 * - 'info': 信息级别日志文件
 * - 'error': 错误级别日志文件
 * 注意：文件系统中不存在'all'级别，因为每个文件都是具体的级别
 */
export type LogFileLevel = 'info' | 'error';

/**
 * 系统日志文件列表请求参数
 * 用于获取系统级别的日志文件列表
 */
export type SystemLogFilesReqDto = {
  /** 日志级别过滤，可选值：'info' | 'error' | 'all'，默认为 'all' */
  level?: LogLevel;
};

/**
 * 系统日志文件信息
 * 描述单个日志文件的基本信息
 */
export type SystemLogFileItem = {
  /** 日志文件名，格式：application-{level}-{date}.log */
  filename: string;
  /** 日志文件日期，格式：YYYY-MM-DD */
  date: string;
  /** 日志级别，只能是 'info' 或 'error' */
  level: LogFileLevel;
  /** 文件大小，单位：字节 */
  size: number;
};

/**
 * 系统日志文件列表响应
 * 返回符合条件的日志文件列表
 */
export type SystemLogFilesResDto = {
  /** 日志文件列表 */
  files: SystemLogFileItem[];
};

/**
 * 用户日志文件列表请求参数
 * 用于获取特定用户的日志文件列表
 */
export type UserLogFilesReqDto = {
  /** 用户ID，必填，用于定位用户日志目录 */
  userId: string;
};

/**
 * 用户搜索结果项
 * 描述单个用户的基本信息
 */
export type UserSearchItemDto = {
  /** 用户ID，用于后续的日志查询 */
  userId: string;
  /** 用户名称，用于显示 */
  name: string;
};

/**
 * 用户搜索结果响应
 * 返回符合条件的用户列表
 */
export type UserSearchResDto = {
  /** 用户列表 */
  list: UserSearchItemDto[];
};

/**
 * 读取日志请求参数（通用）
 * 用于读取系统日志或用户日志文件内容
 */
export type ReadLogReqDto = {
  /** 日志文件名，服务端会进行白名单校验，确保安全性 */
  filename: string;
};

/**
 * 读取用户日志请求参数
 * 继承自ReadLogReqDto，增加用户ID字段
 */
export type ReadUserLogReqDto = ReadLogReqDto & {
  /** 用户ID，用于定位用户日志目录 */
  userId: string;
};

/**
 * 日志行内容项
 * 描述单行日志的详细信息
 */
export type LogLineItem = {
  /** 时间戳，格式：YYYY-MM-DD HH:mm:ss */
  ts: string;
  /** 日志级别，如：'info', 'error' */
  level: string;
  /** 日志消息内容 */
  message: string;
  /** 原始日志行内容，包含完整信息 */
  raw: string;
};
