import { createBrowserRouter, Navigate, RouteObject } from 'react-router'

import ErrorPage from '@/components/Error'
import { Component as Layout } from '@/components/Layout'
import { sideRoutes, topRoutes } from './router/routesConfig.tsx'
import { RouteItem } from '@/types'

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

const router = createBrowserRouter([
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
])

export default router
