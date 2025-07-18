import {
  BarChartOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GlobalOutlined,
  GoldOutlined,
  HomeOutlined,
  RiseOutlined,
  TeamOutlined
} from '@ant-design/icons'

import { Component as ArticleManagement } from '@/pages/ArticleManagement'
import { Component as ModifyArticle } from '@/pages/ArticleManagement/Modify'

import { Component as DataManagement } from '@/pages/DataManagement'
import { Component as ExportData } from '@/pages/DataManagement/Export'
import { Component as ImportData } from '@/pages/DataManagement/Import'
import { Component as ModifyData } from '@/pages/DataManagement/Modify'
import { Component as EvaluationModel } from '@/pages/EvaluationModel'
import { Component as MapEdit } from '@/pages/Map/MapEdit'
import { Component as UrbanizationRate } from '@/pages/Map/UrbanizationRate'
import { Component as Home } from '@/pages/Home'
import { Component as ComprehensiveEvaluation } from '@/pages/ComprehensiveEvaluation'
import { Component as HumanDynamics } from '@/pages/HumanDynamics'
import { Component as MaterialDynamics } from '@/pages/MaterialDynamics'
import { Component as SpatialDynamics } from '@/pages/SpatialDynamics'
import { Component as UrbanizationProcess } from '@/pages/UrbanizationProcess'
import { RouteItem } from '@/types'

// 顶部导航菜单配置
export const topRoutes: RouteItem[] = [
  { path: '/home', title: '首页', icon: <HomeOutlined />, component: Home },
  {
    path: '/comprehensiveEvaluation',
    title: '综合评价',
    icon: <BarChartOutlined />,
    component: ComprehensiveEvaluation
  },
  {
    path: '/urbanizationProcess',
    title: '城镇化进程',
    icon: <RiseOutlined />,
    component: UrbanizationProcess
  },
  {
    path: '/humanDynamics',
    title: '人性动力',
    icon: <TeamOutlined />,
    component: HumanDynamics
  },
  {
    path: '/materialDynamics',
    title: '物性动力',
    icon: <GoldOutlined />,
    component: MaterialDynamics
  },
  {
    path: '/spatialDynamics',
    title: '空间动力',
    icon: <GlobalOutlined />,
    component: SpatialDynamics
  }
]

// 侧边栏导航菜单配置
export const sideRoutes: RouteItem[] = [
  {
    path: '/dataManagement',
    title: '数据管理',
    icon: <DatabaseOutlined />,
    component: DataManagement,
    children: [
      {
        path: '/dataManagement/modify/:countryId/:year',
        title: '数据编辑',
        component: ModifyData,
        hideInMenu: true
      },
      {
        path: '/dataManagement/create',
        title: '数据录入',
        component: ModifyData,
        hideInMenu: true
      },
      {
        path: '/dataManagement/import',
        title: '数据导入',
        component: ImportData,
        hideInMenu: true
      },
      {
        path: '/dataManagement/export',
        title: '数据导出',
        component: ExportData,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/map',
    title: '地图功能',
    icon: <EnvironmentOutlined />,
    children: [
      {
        path: '/map/urbanizationRate',
        title: '城镇化率',
        component: UrbanizationRate
      },
      {
        path: '/map/mapEdit',
        title: '地图修改',
        component: MapEdit
      }
    ]
  },
  {
    path: '/evaluationModel',
    title: '评估模型',
    icon: <CalculatorOutlined />,
    component: EvaluationModel
  },
  {
    path: '/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    component: ArticleManagement,
    children: [
      {
        path: '/article/create',
        title: '新增文章',
        component: ModifyArticle,
        hideInMenu: true
      },
      {
        path: '/article/edit/:id',
        title: '编辑文章',
        component: ModifyArticle,
        hideInMenu: true
      }
    ]
  }
]

// 获取所有路由项（扁平化）
export const getAllRoutes = (): RouteItem[] => {
  const flattenRoutes = (routes: RouteItem[]): RouteItem[] => {
    return routes.reduce((acc: RouteItem[], route) => {
      acc.push(route)
      if (route.children) {
        acc.push(...flattenRoutes(route.children))
      }
      return acc
    }, [])
  }

  return [...flattenRoutes(topRoutes), ...flattenRoutes(sideRoutes)]
}

// 根据路径获取面包屑项
export const getBreadcrumbItems = (
  pathname: string
): { path: string; title: string; component: React.ComponentType | undefined }[] => {
  const allRoutes = getAllRoutes()
  const result: { path: string; title: string; component: React.ComponentType | undefined }[] = []

  // 构建路径映射表
  const pathMap = new Map<string, RouteItem>()
  allRoutes.forEach(route => {
    const routePath = route.path.replace(/\/:[^/]+/g, '/*')
    pathMap.set(routePath, route)
  })

  // 构建面包屑
  const pathSegments = pathname.split('/').filter(Boolean)
  let currentPath = ''

  pathSegments.forEach(segment => {
    currentPath += '/' + segment

    // 处理动态路由参数
    const pathToCheck = currentPath.replace(/\/\d+/g, '/*')

    // 尝试找到匹配的路由配置
    const matchingRoute =
      pathMap.get(pathToCheck) ||
      pathMap.get(currentPath) ||
      allRoutes.find(route => {
        const routePathPattern = route.path.replace(/\/:[^/]+/g, '/[^/]+')
        const regex = new RegExp(`^${routePathPattern}$`)
        return regex.test(currentPath)
      })

    if (matchingRoute && !matchingRoute.hideInBreadcrumb) {
      result.push({
        path: currentPath,
        title: matchingRoute.title,
        component: matchingRoute.component
      })
    }
  })

  return result
}
