import { LazyExoticComponent, ReactNode } from 'react'

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: React.ComponentType | LazyExoticComponent<React.ComponentType>
  hideInMenu?: boolean
  hideInBreadcrumb?: boolean
  children?: RouteItem[]
  adminOnly?: boolean // 仅admin可见
}

/**
 * @description 表格中每行国家的类型定义
 */
export type CountryRowData = {
  key: string
  countryId: string
  cnName: string
  enName: string
  urbanization: boolean
  continent: string
}

/**
 * @description 大洲数量统计表格每行的数据类型
 */
export type ContinentCountData = {
  key: string
  continent: string
  count: number
}

/**
 * 导出数据相关类型
 */
export enum ExportFormat {
  XLSX = 'xlsx',
  CSV = 'csv',
  JSON = 'json'
}

/**
 * 导出格式选项 - 用于前端渲染
 */
export const ExportFormatOptions = [
  { value: ExportFormat.CSV, label: 'CSV' },
  { value: ExportFormat.XLSX, label: 'XLSX (Excel)' },
  { value: ExportFormat.JSON, label: 'JSON' }
]

// 统一引入后端DTO类型，供前端全局使用
import type {
  // 角色管理相关DTO
  AssignRoleRoutesDto,
  CreateRoleDto,
  CreateUserDto,
  DeleteRoleDto,
  DeleteUserDto,
  // 认证相关
  LoginDto,
  LoginResponseDto,
  // 系统日志相关DTO
  LogLevel,
  LogLineItem,
  LogUsersResDto,
  ReadLogReqDto,
  ReadUserLogReqDto,
  ResetUserPasswordDto,
  RoleListItemDto,
  RoleListResDto,
  SystemLogFilesReqDto,
  SystemLogFilesResDto,
  TokenPayloadDto,
  UpdateRoleDto,
  UpdateUserDto,
  // 用户管理相关DTO
  UserListItemDto,
  UserListResDto,
  UserLogFilesReqDto,
  UserProfileDto
} from 'urbanization-backend/types/dto'
// 认证相关DTO
export type { LoginDto, LoginResponseDto, TokenPayloadDto, UserProfileDto }
// 角色管理相关DTO
export type {
  AssignRoleRoutesDto,
  CreateRoleDto,
  DeleteRoleDto,
  RoleListItemDto,
  RoleListResDto,
  UpdateRoleDto
}
// 系统日志相关DTO
export type {
  LogLevel,
  LogLineItem,
  LogUsersResDto,
  ReadLogReqDto,
  ReadUserLogReqDto,
  SystemLogFilesReqDto,
  SystemLogFilesResDto,
  UserLogFilesReqDto
}
// 用户管理相关DTO
export type {
  CreateUserDto,
  DeleteUserDto,
  ResetUserPasswordDto,
  UpdateUserDto,
  UserListItemDto,
  UserListResDto
}
