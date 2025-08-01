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
import { Component as OrderConfig } from '@/pages/ArticleManagement/OrderConfig'
import { Component as ComprehensiveEvaluation } from '@/pages/ComprehensiveEvaluation'
import { Component as ComprehensiveEvaluationDetail } from '@/pages/ComprehensiveEvaluation/Detail'
import { Component as DataManagement } from '@/pages/DataManagement'
import { Component as ExportData } from '@/pages/DataManagement/Export'
import { Component as ImportData } from '@/pages/DataManagement/Import'
import { Component as ModifyData } from '@/pages/DataManagement/Modify'
import { Component as EvaluationModel } from '@/pages/EvaluationModel'
import { Component as WeightManagement } from '@/pages/EvaluationModel/WeightManagement'
import { Component as Home } from '@/pages/Home'
import { Component as HumanDynamics } from '@/pages/HumanDynamics'
import { Component as MapEdit } from '@/pages/Map/MapEdit'
import { Component as UrbanizationRate } from '@/pages/Map/UrbanizationRate'
import { Component as MaterialDynamics } from '@/pages/MaterialDynamics'
import { Component as ScoreManagement } from '@/pages/ScoreManagement'
import { Component as ScoreEvaluation } from '@/pages/ScoreManagement/Evaluation'
import { Component as ImportScore } from '@/pages/ScoreManagement/Import'
import { Component as ModifyScore } from '@/pages/ScoreManagement/Modify'
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
    component: ComprehensiveEvaluation,
    children: [
      {
        path: '/comprehensiveEvaluation/detail/:countryId/:year',
        title: '评价详情',
        component: ComprehensiveEvaluationDetail,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/urbanizationProcess',
    title: '城镇化进程',
    icon: <RiseOutlined />,
    component: UrbanizationProcess
  },
  {
    path: '/humanDynamics',
    title: '人口迁徙动力',
    icon: <TeamOutlined />,
    component: HumanDynamics
  },
  {
    path: '/materialDynamics',
    title: '经济发展动力',
    icon: <GoldOutlined />,
    component: MaterialDynamics
  },
  {
    path: '/spatialDynamics',
    title: '空间发展动力',
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
    children: [
      {
        path: '/dataManagement/list',
        title: '数据列表',
        component: DataManagement
      },
      {
        path: '/dataManagement/import',
        title: '数据导入',
        component: ImportData
      },
      {
        path: '/dataManagement/export',
        title: '数据导出',
        component: ExportData
      },
      {
        path: '/dataManagement/create',
        title: '数据录入',
        component: ModifyData
      },
      {
        path: '/dataManagement/modify/:countryId/:year',
        title: '数据编辑',
        component: ModifyData,
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
        title: '世界城镇化地图',
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
    path: '/scoreManagement',
    title: '评分管理',
    icon: <CalculatorOutlined />,
    children: [
      {
        path: '/scoreManagement/list',
        title: '评分列表',
        component: ScoreManagement
      },
      {
        path: '/scoreManagement/import',
        title: '评分导入',
        component: ImportScore
      },
      {
        path: '/scoreManagement/create',
        title: '评分录入',
        component: ModifyScore
      },
      {
        path: '/scoreManagement/evaluation',
        title: '配置评分体系',
        component: ScoreEvaluation
      },
      {
        path: '/scoreManagement/modify/:countryId/:year',
        title: '评分编辑',
        component: ModifyScore,
        hideInMenu: true
      }
    ]
  },
  {
    path: '/evaluationModel',
    title: '评估模型',
    icon: <CalculatorOutlined />,
    children: [
      {
        path: '/evaluationModel/weight',
        title: '权重管理',
        component: WeightManagement
      }
    ]
  },
  {
    path: '/article',
    title: '文章管理',
    icon: <FileTextOutlined />,
    children: [
      {
        path: '/article/list',
        title: '文章列表',
        component: ArticleManagement
      },
      {
        path: '/article/create',
        title: '新增文章',
        component: ModifyArticle
      },
      {
        path: '/article/order',
        title: '配置文章顺序',
        component: OrderConfig
      },
      {
        path: '/article/modify/:id',
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
