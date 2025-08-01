import { GlobalOutlined } from '@ant-design/icons' // 导入图标
import { Breadcrumb, Layout, Menu, MenuProps, Typography } from 'antd'
import { FC, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import { getBreadcrumbItems, sideRoutes, topRoutes } from '@/router/routesConfig'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useIndicatorStore from '@/stores/indicatorStore'

const { Header, Sider, Content, Footer } = Layout
const { Title } = Typography

export const Component: FC = () => {
  const outlet = useOutlet()
  const navigate = useNavigate()
  const getIndicatorHierarchy = useIndicatorStore(state => state.getIndicatorHierarchy)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

  // 全局获取一次指标数据
  useEffect(() => {
    getIndicatorHierarchy()
    getCountries()
  }, [])

  const handleMenuClick: MenuProps['onClick'] = e => {
    navigate(e.key)
  }

  // 计算顶部导航菜单的激活项
  const topNavSelectedKey = useMemo(() => {
    const pathSegments = pathname.split('/').filter(Boolean)
    if (pathSegments.length === 0) return ['/home']
    return [`/${pathSegments[0]}`]
  }, [pathname])

  // 当子菜单被选中时，确保父菜单保持展开状态
  const defaultOpenKeys = useMemo(() => {
    const pathSegments = pathname.split('/').filter(i => i)
    if (pathSegments.length > 1) {
      return [`/${pathSegments[0]}`]
    }
    return []
  }, [pathname])

  // 根据路由配置生成顶部菜单项
  const topMenuItems: MenuProps['items'] = topRoutes.map(route => ({
    key: route.path,
    label: route.title,
    icon: route.icon
  }))

  // 根据路由配置生成侧边菜单项
  const menuItems: MenuProps['items'] = sideRoutes.map(route => {
    const item: any = {
      key: route.path,
      icon: route.icon,
      label: route.title
    }

    if (route.children && route.children.filter(child => !child.hideInMenu).length > 0) {
      item.children = route.children
        .filter(child => !child.hideInMenu)
        .map(child => ({
          key: child.path,
          label: child.title
        }))
    }

    return item
  })

  // 获取面包屑项
  const breadcrumbItems = useMemo(() => {
    return getBreadcrumbItems(pathname).map(item => ({
      title:
        item.component && item.path !== pathname ? (
          <Link to={item.path}>{item.title}</Link>
        ) : (
          item.title
        )
    }))
  }, [pathname])

  return (
    <Layout className="h-screen w-full bg-gray-50">
      {/* 现代化的头部设计 */}
      <Header
        className="flex items-center justify-between px-8 py-0 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* 左侧Logo区域 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20">
              <GlobalOutlined className="text-xl text-white" />
            </div>
            <Title
              level={4}
              className="!mb-0 !text-white"
            >
              世界城镇化分析平台
            </Title>
          </div>
        </div>

        {/* 中间导航菜单 */}
        <div className="flex flex-1 justify-center">
          <Menu
            theme="dark"
            mode="horizontal"
            items={topMenuItems}
            selectedKeys={topNavSelectedKey}
            onClick={handleMenuClick}
            className="border-none bg-transparent"
            style={{
              background: 'transparent',
              borderBottom: 'none'
            }}
          />
        </div>

        {/* 右侧用户区域 - 保持原有简单设计 */}
        <div className="flex-shrink-0"></div>
      </Header>

      <Layout className="flex-grow">
        {/* 优化的侧边栏设计 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          className="border-r border-gray-200 shadow-sm"
          width={260}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
            borderRight: '1px solid #e5e7eb'
          }}
        >
          <Menu
            theme="light"
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            selectedKeys={[pathname]}
            defaultOpenKeys={defaultOpenKeys}
            className="border-none"
            style={{
              background: 'transparent',
              borderRight: 'none'
            }}
          />
        </Sider>

        <Layout className="bg-gray-50">
          {/* 内容区域 */}
          <Content className="!flex flex-grow flex-col p-6">
            {/* 面包屑导航 */}
            <div className="mb-6 rounded-lg bg-white p-4 shadow-sm">
              <Breadcrumb
                items={breadcrumbItems}
                className="text-sm"
              />
            </div>

            {/* 主要内容区域 */}
            <div className="flex-grow overflow-hidden rounded-xl bg-white shadow-lg">
              <div className="h-full overflow-y-auto p-8">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </div>
          </Content>

          {/* 现代化的页脚 */}
          <Footer className="border-t border-gray-200 bg-white px-8 py-4 text-center">
            <div className="flex items-center justify-center space-x-8 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <GlobalOutlined className="text-blue-500" />
                <span>世界城镇化分析平台</span>
              </div>
              <div className="h-4 w-px bg-gray-300"></div>
              <div>技术支持：1234567890</div>
            </div>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
