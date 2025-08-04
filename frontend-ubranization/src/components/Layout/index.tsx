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
    <Layout className="h-screen w-full bg-slate-100">
      {/* 深色政务风格顶部导航栏 */}
      <Header
        className="flex items-center justify-between px-6 text-white"
        style={{
          background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
          borderBottom: '3px solid #475569',
          height: '70px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* 左侧标题区域 */}
        <div className="flex items-center">
          <div className="text-2xl font-bold tracking-wider text-white">城镇化进程评价展示平台</div>
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
              lineHeight: '70px'
            }}
          />
        </div>
      </Header>

      <Layout className="flex-grow">
        {/* 深色侧边栏 */}
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          width={260}
          className="shadow-xl"
          style={{
            background: '#1e293b',
            borderRight: '2px solid #475569'
          }}
        >
          <Menu
            theme="dark"
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
              fontWeight: 500,
              background: '#1e293b'
            }}
            className="pt-6"
          />
        </Sider>

        {/* 主内容区域 */}
        <Layout className="bg-slate-100">
          <Content className="!flex flex-grow flex-col p-8">
            {/* 深色风格面包屑导航 */}
            <div className="mb-6 rounded-lg border-l-4 border-slate-600 bg-white px-4 py-3 shadow-sm">
              <Breadcrumb
                items={breadcrumbItems}
                className="text-slate-700"
                style={{ fontSize: '15px', fontWeight: 500 }}
              />
            </div>

            {/* 主内容容器 */}
            <div className="flex-grow overflow-y-auto">
              <div className="min-h-full rounded-xl border-2 border-slate-200 bg-white p-8 shadow-lg">
                <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
              </div>
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}
