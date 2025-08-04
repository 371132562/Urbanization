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

// 橙色主题配置
const orangeTheme = {
  token: {
    colorPrimary: '#f97316', // 主色调：橙色
    colorPrimaryHover: '#ea580c', // 主色调悬停
    colorPrimaryActive: '#dc2626', // 主色调激活
    colorSuccess: '#22c55e', // 成功色
    colorWarning: '#f59e0b', // 警告色
    colorError: '#ef4444', // 错误色
    colorInfo: '#3b82f6', // 信息色
    borderRadius: 12, // 圆角
    wireframe: false // 关闭线框模式
  },
  components: {
    Menu: {
      colorItemBg: '#fff7ed', // 菜单背景色
      colorItemBgSelected: '#fed7aa', // 选中项背景色
      colorItemText: '#9a3412', // 菜单文字色
      colorItemTextSelected: '#ea580c', // 选中项文字色
      colorActiveBarBorderSize: 4, // 激活条边框大小
      colorActiveBarWidth: 5 // 激活条宽度
    },
    Button: {
      borderRadius: 8, // 按钮圆角
      controlHeight: 40 // 按钮高度
    },
    Card: {
      borderRadius: 16, // 卡片圆角
      boxShadow: '0 8px 25px rgba(251, 146, 60, 0.15)' // 卡片阴影
    },
    Table: {
      borderRadius: 12, // 表格圆角
      headerBg: '#fff7ed' // 表头背景
    },
    Input: {
      borderRadius: 8, // 输入框圆角
      activeBorderColor: '#f97316' // 激活边框色
    },
    Select: {
      borderRadius: 8 // 选择器圆角
    },
    Modal: {
      borderRadius: 16 // 模态框圆角
    },
    Drawer: {
      borderRadius: 16 // 抽屉圆角
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
      theme={orangeTheme}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>
)
