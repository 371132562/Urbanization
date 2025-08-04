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
    <Layout className="h-screen w-full bg-orange-50">
      {/* 橙色政务风格顶部导航栏 */}
      <Header
        className="flex items-center justify-between px-8 text-white"
        style={{
          background: 'linear-gradient(135deg, #9a3412 0%, #ea580c 30%, #f97316 70%, #fb923c 100%)',
          borderBottom: '4px solid #ea580c',
          height: '76px',
          boxShadow: '0 8px 25px rgba(251, 146, 60, 0.25)'
        }}
      >
        {/* 左侧标题区域 */}
        <div className="flex items-center">
          <div className="text-2xl font-bold tracking-wider text-white">经济动力评价展示平台</div>
        </div>

        {/* 右侧导航菜单 */}
        <div className="flex items-center">
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
              lineHeight: '76px'
            }}
          />
        </div>
      </Header>

      <Layout className="flex-grow">
        {/* 橙色主题侧边栏 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="light"
          width={280}
          className="shadow-2xl"
          style={{
            background: '#fff7ed',
            borderRight: '3px solid #f97316'
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
            className="pt-8"
          />
        </Sider>

        {/* 主内容区域 */}
        <Layout className="bg-orange-50">
          <Content className="!flex flex-grow flex-col p-8">
            {/* 橙色风格面包屑导航 */}
            <div className="mb-6 rounded-2xl border-l-4 border-orange-500 bg-white px-6 py-4 shadow-lg">
              <Breadcrumb
                items={breadcrumbItems}
                className="text-orange-800"
                style={{ fontSize: '15px', fontWeight: 500 }}
              />
            </div>

            {/* 主内容容器 */}
            <div className="flex-grow overflow-y-auto">
              <div className="min-h-full rounded-3xl border-2 border-orange-200 bg-white p-8 shadow-2xl">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
