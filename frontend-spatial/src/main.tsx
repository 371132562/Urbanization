import './index.css'
import 'normalize.css'
import 'dayjs/locale/zh-cn'

import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import router from './router.tsx'

dayjs.locale('zh-cn')

// 紫色主题配置
const purpleTheme = {
  token: {
    colorPrimary: '#8b5cf6', // 主色调：紫色
    colorPrimaryHover: '#7c3aed', // 主色调悬停
    colorPrimaryActive: '#6d28d9', // 主色调激活
    colorSuccess: '#22c55e', // 成功色
    colorWarning: '#f59e0b', // 警告色
    colorError: '#ef4444', // 错误色
    colorInfo: '#3b82f6', // 信息色
    borderRadius: 10, // 圆角
    wireframe: false // 关闭线框模式
  },
  components: {
    Menu: {
      colorItemBg: '#faf5ff', // 菜单背景色
      colorItemBgSelected: '#f3e8ff', // 选中项背景色
      colorItemText: '#581c87', // 菜单文字色
      colorItemTextSelected: '#7c3aed', // 选中项文字色
      colorActiveBarBorderSize: 3, // 激活条边框大小
      colorActiveBarWidth: 4 // 激活条宽度
    },
    Button: {
      borderRadius: 8, // 按钮圆角
      controlHeight: 38 // 按钮高度
    },
    Card: {
      borderRadius: 14, // 卡片圆角
      boxShadow: '0 6px 20px rgba(139, 92, 246, 0.12)' // 卡片阴影
    },
    Table: {
      borderRadius: 10, // 表格圆角
      headerBg: '#faf5ff' // 表头背景
    },
    Input: {
      borderRadius: 8, // 输入框圆角
      activeBorderColor: '#8b5cf6' // 激活边框色
    },
    Select: {
      borderRadius: 8 // 选择器圆角
    },
    Modal: {
      borderRadius: 14 // 模态框圆角
    },
    Drawer: {
      borderRadius: 14 // 抽屉圆角
    },
    Breadcrumb: {
      fontSize: 15, // 面包屑字体大小
      fontWeight: 500 // 面包屑字体粗细
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={purpleTheme}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>
)
