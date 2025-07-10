import { createBrowserRouter, Navigate } from 'react-router'

import ErrorPage from './components/Error'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/home" />,
    errorElement: <ErrorPage />
  },
  {
    lazy: () => import('./components/Layout'),
    // 将错误元素放在布局路由上，它可以捕获所有子路由的渲染错误
    errorElement: <ErrorPage />,
    children: [
      {
        path: '/home',
        lazy: () => import('./pages/Home')
      }
    ]
  }
])

export default router
