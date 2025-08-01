import { BarChartOutlined, UserOutlined } from '@ant-design/icons' // 导入图标
import { Breadcrumb, Divider, Layout, Menu, MenuProps, Typography } from 'antd'
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
    <Layout className="h-screen w-full bg-blue-50">
      {/* 蓝色商务风格头部 */}
      <Header
        className="flex items-center justify-between px-8 py-0 shadow-lg"
        style={{
          background: 'linear-gradient(135deg, #00adb5 0%, #1890ff 50%, #096dd9 100%)',
          borderBottom: '2px solid #e6f7ff'
        }}
      >
        {/* 左侧品牌区域 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-lg backdrop-blur-sm">
              <BarChartOutlined className="text-2xl text-white" />
            </div>
            <div className="flex flex-col">
              <Title
                level={4}
                className="!mb-0 !text-white"
              >
                城镇化发展质量评价模型展示平台
              </Title>
              <div className="text-xs text-blue-100">Urbanization Evaluation Platform</div>
            </div>
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
      </Header>

      <Layout className="flex-grow">
        {/* 蓝色主题侧边栏设计 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          className="shadow-xl"
          width={250}
          style={{
            background: 'linear-gradient(180deg, #ffffff 0%, #f0f8ff 100%)',
            borderRight: '1px solid #e6f7ff'
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

        <Layout className="bg-blue-50">
          {/* 内容区域 */}
          <Content className="!flex flex-grow flex-col p-6">
            {/* 面包屑导航 */}
            <div className="mb-6 rounded-xl border border-blue-100 bg-white p-4 shadow-md">
              <Breadcrumb
                items={breadcrumbItems}
                className="text-sm"
              />
            </div>

            {/* 主要内容区域 */}
            <div className="flex-grow overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-xl">
              <div className="h-full overflow-y-auto p-8">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </div>
          </Content>

          {/* 蓝色商务风格页脚 */}
          <Footer className="border-t border-blue-100 bg-white px-8 py-6 text-center shadow-inner">
            <div className="flex items-center justify-center space-x-6 text-sm text-blue-600">
              <div className="flex items-center space-x-2">
                <BarChartOutlined className="text-blue-500" />
                <span className="font-medium">城镇化发展质量评价模型展示平台</span>
              </div>
            </div>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
