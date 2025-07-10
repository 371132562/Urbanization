// import {
//   DashboardOutlined,
//   EnvironmentOutlined,
//   FileTextOutlined,
//   GroupOutlined,
//   SettingOutlined,
//   ShoppingOutlined,
//   TagsOutlined,
//   TeamOutlined,
//   UnorderedListOutlined,
//   UserOutlined
// } from '@ant-design/icons' // 导入更多图标
// import { Drawer, Form, Switch } from 'antd'
import { FC } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useOutlet } from 'react-router'

// import { NavLink } from 'react-router'
import ErrorPage from '@/components/Error'

export const Component: FC = () => {
  const outlet = useOutlet()

  return (
    <>
      <div className="h-dvh w-full">
        <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
      </div>
    </>
  )
}
