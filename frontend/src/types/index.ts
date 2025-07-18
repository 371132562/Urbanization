import { ReactNode } from 'react'

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: React.ComponentType
  hideInMenu?: boolean
  hideInBreadcrumb?: boolean
  children?: RouteItem[]
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