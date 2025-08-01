import { UserOutlined, DatabaseOutlined } from '@ant-design/icons' // 导入图标
import { Breadcrumb, Layout, Menu, MenuProps, Typography, Divider } from 'antd'
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
    <Layout className="h-screen w-full bg-slate-50">
      {/* 深色商务风格头部 */}
      <Header className="flex items-center justify-between px-6 py-0 shadow-lg" style={{ 
        background: 'linear-gradient(90deg, #1f2937 0%, #374151 50%, #4b5563 100%)',
        borderBottom: '2px solid #f59e0b'
      }}>
        {/* 左侧品牌区域 */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 shadow-lg">
              <DatabaseOutlined className="text-2xl text-white" />
            </div>
            <div className="flex flex-col">
              <Title level={4} className="!mb-0 !text-white">
              城镇化发展质量打分管理平台
              </Title>
            </div>
          </div>
        </div>

        {/* 中间导航菜单 */}
        <div className="flex-1 flex justify-center">
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
        {/* 深色侧边栏设计 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          className="shadow-xl"
          width={240}
          style={{
            background: 'linear-gradient(180deg, #111827 0%, #1f2937 100%)',
            borderRight: '1px solid #374151'
          }}
        >
          <Menu
            theme="dark"
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

        <Layout className="bg-slate-50">
          {/* 内容区域 */}
          <Content className="!flex flex-grow flex-col p-6">
            {/* 面包屑导航 */}
            <div className="mb-6 rounded-xl bg-white p-4 shadow-md border border-slate-200">
              <Breadcrumb 
                items={breadcrumbItems}
                className="text-sm"
              />
            </div>
            
            {/* 主要内容区域 */}
            <div className="flex-grow overflow-hidden rounded-2xl bg-white shadow-xl border border-slate-200">
              <div className="h-full overflow-y-auto p-8">
                <ErrorBoundary FallbackComponent={ErrorPage}>
                  {outlet}
                </ErrorBoundary>
              </div>
            </div>
          </Content>

          {/* 深色商务风格页脚 */}
          <Footer className="border-t border-slate-200 bg-white px-8 py-6 text-center shadow-inner">
            <div className="flex items-center justify-center space-x-6 text-sm text-slate-600">
              <div className="flex items-center space-x-2">
                <DatabaseOutlined className="text-amber-500" />
                <span className="font-medium">城镇化发展质量打分管理平台</span>
              </div>
            </div>
          </Footer>
        </Layout>
      </Layout>
    </Layout>
  )
}
