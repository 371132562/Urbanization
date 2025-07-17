import { ReactNode } from 'react'

/**
 * 路由项类型定义
 */
export type RouteItem = {
  path: string
  title: string
  icon?: ReactNode
  component?: string
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
