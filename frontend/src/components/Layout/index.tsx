import {
  BarChartOutlined,
  CalculatorOutlined,
  DatabaseOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  GlobalOutlined,
  GoldOutlined,
  HomeOutlined,
  RiseOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons' // 导入图标
import { Layout, Menu, MenuProps } from 'antd'
import { FC, useMemo, useState } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { useLocation, useNavigate, useOutlet } from 'react-router'

import ErrorPage from '@/components/Error'

const { Header, Sider, Content } = Layout

export const Component: FC = () => {
  const outlet = useOutlet()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const { pathname } = useLocation()

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

  const topMenuItems: MenuProps['items'] = [
    { key: '/home', label: '首页', icon: <HomeOutlined /> },
    {
      key: '/comprehensiveEvaluation',
      label: '综合评价',
      icon: <BarChartOutlined />
    },
    {
      key: '/urbanizationProcess',
      label: '城镇化进程',
      icon: <RiseOutlined />
    },
    { key: '/humanDynamics', label: '人性动力', icon: <TeamOutlined /> },
    { key: '/materialDynamics', label: '物性动力', icon: <GoldOutlined /> },
    { key: '/spatialDynamics', label: '空间动力', icon: <GlobalOutlined /> }
  ]

  const menuItems: MenuProps['items'] = [
    {
      key: '/dataManagement',
      icon: <DatabaseOutlined />,
      label: '数据管理'
    },
    {
      key: '/map',
      icon: <EnvironmentOutlined />,
      label: '地图功能',
      children: [
        {
          key: '/map/urbanizationRate',
          label: '城镇化率'
        },
        {
          key: '/map/mapEdit',
          label: '地图修改'
        }
      ]
    },
    {
      key: '/evaluationModel',
      icon: <CalculatorOutlined />,
      label: '评估模型'
    },
    {
      key: '/articleManagement',
      icon: <FileTextOutlined />,
      label: '文章管理'
    }
  ]

  return (
    <Layout className="h-screen w-full">
      <Header className="flex items-center px-6 text-white">
        <div className="flex-shrink-0 text-xl font-bold text-white">世界城镇化</div>
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
          className="overflow-y-auto"
          width={220}
        >
          <Menu
            theme="dark"
            mode="inline"
            items={menuItems}
            onClick={handleMenuClick}
            // 将菜单的选中状态与路由同步
            selectedKeys={[pathname]}
            // 默认展开包含活动项的子菜单
            defaultOpenKeys={defaultOpenKeys}
          />
        </Sider>
        <Content className="!flex flex-grow flex-col bg-gray-100 px-8 py-14">
          <div className="flex-grow overflow-y-auto rounded-lg bg-white p-6 shadow-md">
            <ErrorBoundary FallbackComponent={ErrorPage}>{outlet}</ErrorBoundary>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}
