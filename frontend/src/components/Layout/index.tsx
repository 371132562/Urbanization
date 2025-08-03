import { UserOutlined } from '@ant-design/icons' // 导入图标
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
    <Layout className="h-screen w-full">
      <Header className="flex items-center px-6 text-white">
        <div className="flex-shrink-0 text-xl font-bold text-white">
          城镇化发展质量评价技术示范平台
        </div>
        <div className="flex-grow" />
        <Menu
          theme="dark"
          mode="horizontal"
          items={topMenuItems}
          selectedKeys={topNavSelectedKey}
          onClick={handleMenuClick}
          className="flex-grow-0"
          style={{ minWidth: 0 }}
        />
        <div className="flex-grow" />
        <div className="flex-shrink-0">
          <UserOutlined className="text-xl" />
        </div>
      </Header>
      <Layout className="flex-grow">
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          theme="dark"
          width={220}
          className="flex flex-col"
        >
          <Menu
            theme="dark"
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            onOpenChange={handleOpenChange}
            // 将菜单的选中状态与路由同步
            selectedKeys={[pathname]}
            // 控制菜单展开状态，支持手动操作和路由驱动
            openKeys={openKeys}
            // 设置菜单高度和滚动，确保所有菜单项都能显示
            style={{
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden'
            }}
          />
        </Sider>
        <Layout>
          <Content className="!flex flex-grow flex-col bg-gray-100 p-6">
            {/* 添加面包屑导航 */}
            <div className="mb-2">
              <Breadcrumb items={breadcrumbItems} />
            </div>
            <div className="box-border flex flex-grow justify-center overflow-y-auto rounded-lg bg-white p-6 shadow-md">
              <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
            </div>
          </Content>
          {/* <Footer>
            <div className="flex w-full justify-center">帮助与支持 如需帮助请联系 1234567890</div>
          </Footer> */}
        </Layout>
      </Layout>
    </Layout>
  )
}
