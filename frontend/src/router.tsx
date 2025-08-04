import { createBrowserRouter, Navigate, RouteObject } from 'react-router'

import ErrorPage from '@/components/Error'
import { Component as Layout } from '@/components/Layout'
import { RouteItem } from '@/types'

import { sideRoutes, topRoutes } from './router/routesConfig.tsx'

// 根据路由配置生成路由
const generateRoutes = (): RouteObject[] => {
  const generateChildrenRoutes = (routes: RouteItem[]): RouteObject[] => {
    return routes.flatMap(route => {
      const result: RouteObject[] = []

      // 添加主路由
      if (route.component) {
        result.push({
          path: route.path,
          element: <route.component />
        })
      }

      // 添加子路由
      if (route.children) {
        result.push(...generateChildrenRoutes(route.children))
      }

      return result
    })
  }

  // 合并顶部和侧边栏路由
  const allRoutes = [...generateChildrenRoutes(topRoutes), ...generateChildrenRoutes(sideRoutes)]

  // 去重
  const pathMap = new Map<string, RouteObject>()
  allRoutes.forEach(route => {
    if (route.path && !pathMap.has(route.path)) {
      pathMap.set(route.path, route)
    }
  })

  return Array.from(pathMap.values())
}

// 获取部署路径，处理斜杠问题
const getBasename = () => {
  const deployPath = import.meta.env.VITE_DEPLOY_PATH || '/'
  return deployPath.endsWith('/') ? deployPath.slice(0, -1) : deployPath
}

const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <Navigate to="/home" />,
      errorElement: <ErrorPage />
    },
    {
      element: <Layout />,
      // 将错误元素放在布局路由上，它可以捕获所有子路由的渲染错误
      errorElement: <ErrorPage />,
      children: generateRoutes()
    }
  ],
  {
    // 设置路由基础路径，如果部署在子目录下需要修改这里
    // 例如部署在 /urbanization/ 子目录下，则设置为 '/urbanization'
    basename: getBasename()
  }
)

export default router
