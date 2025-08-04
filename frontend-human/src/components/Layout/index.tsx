import { Breadcrumb, Layout, Menu, MenuProps } from 'antd'
import { FC, useEffect, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Link, useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'
import { getBreadcrumbItems, sideRoutes, topRoutes } from '@/router/routesConfig'
import useCountryAndContinentStore from '@/stores/countryAndContinentStore'
import useIndicatorStore from '@/stores/indicatorStore'

const { Header, Sider, Content } = Layout

export const Component: FC = () => {
  const outlet = useOutlet()
  const navigate = useNavigate()
  const getIndicatorHierarchy = useIndicatorStore(state => state.getIndicatorHierarchy)
  const getCountries = useCountryAndContinentStore(state => state.getCountries)
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
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

  // 根据当前路径计算应该展开的菜单项
  const defaultOpenKeys = useMemo(() => {
    const pathSegments = pathname.split('/').filter(i => i)
    if (pathSegments.length > 1) {
      return [`/${pathSegments[0]}`]
    }
    return []
  }, [pathname])

  // 处理菜单展开/收起
  const handleOpenChange = (keys: string[]) => {
    setOpenKeys(keys)
  }

  // 当路由变化时，自动展开对应的父菜单
  useEffect(() => {
    setOpenKeys(defaultOpenKeys)
  }, [defaultOpenKeys])

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
    <Layout className="h-screen w-full bg-emerald-50">
      {/* 绿色政务风格顶部导航栏 */}
      <Header
        className="flex items-center px-8 text-white"
        style={{
          background: 'linear-gradient(135deg, #065f46 0%, #047857 30%, #059669 70%, #10b981 100%)',
          borderBottom: '4px solid #047857',
          height: '72px',
          boxShadow: '0 6px 20px rgba(5, 150, 105, 0.2)'
        }}
      >
        {/* 左侧标题区域 */}
        <div className="flex items-center">
          <div className="text-2xl font-bold tracking-wide text-white">城镇化进程评价展示平台</div>
        </div>

        {/* 中间导航菜单 */}
        <div className="flex flex-grow justify-center">
          <Menu
            theme="dark"
            mode="horizontal"
            items={topMenuItems}
            selectedKeys={topNavSelectedKey}
            onClick={handleMenuClick}
            className="border-none bg-transparent"
            style={{
              fontSize: '16px',
              fontWeight: 600,
              lineHeight: '72px'
            }}
          />
        </div>
      </Header>

      <Layout className="flex-grow">
        {/* 绿色主题侧边栏 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={250}
          className="shadow-2xl"
          style={{
            background: '#f0fdf4',
            borderRight: '3px solid #10b981'
          }}
        >
          <Menu
            theme="light"
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            onOpenChange={handleOpenChange}
            selectedKeys={[pathname]}
            openKeys={openKeys}
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              borderRight: 'none',
              fontSize: '15px',
              fontWeight: 500
            }}
            className="pt-6"
          />
        </Sider>

        {/* 主内容区域 */}
        <Layout className="bg-emerald-50">
          <Content className="!flex flex-grow flex-col p-6">
            {/* 绿色风格面包屑导航 */}
            <div className="mb-4 rounded-xl border-l-4 border-emerald-500 bg-white px-4 py-3 shadow-md">
              <Breadcrumb
                items={breadcrumbItems}
                className="text-emerald-800"
                style={{ fontSize: '15px', fontWeight: 500 }}
              />
            </div>

            {/* 主内容容器 */}
            <div className="flex-grow overflow-y-auto">
              <div className="min-h-full rounded-2xl border-2 border-emerald-200 bg-white p-6 shadow-xl">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
