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

// 绿色主题配置
const greenTheme = {
  token: {
    colorPrimary: '#10b981', // 主色调：绿色
    colorPrimaryHover: '#059669', // 主色调悬停
    colorPrimaryActive: '#047857', // 主色调激活
    colorSuccess: '#10b981', // 成功色
    colorWarning: '#f59e0b', // 警告色
    colorError: '#ef4444', // 错误色
    colorInfo: '#10b981', // 信息色
    borderRadius: 8, // 圆角
    wireframe: false // 关闭线框模式
  },
  components: {
    Menu: {
      colorItemBg: '#f0fdf4', // 菜单背景色
      colorItemBgSelected: '#d1fae5', // 选中项背景色
      colorItemText: '#065f46', // 菜单文字色
      colorItemTextSelected: '#047857', // 选中项文字色
      colorActiveBarBorderSize: 3, // 激活条边框大小
      colorActiveBarWidth: 4 // 激活条宽度
    },
    Button: {
      borderRadius: 6, // 按钮圆角
      controlHeight: 36 // 按钮高度
    },
    Card: {
      borderRadius: 12, // 卡片圆角
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)' // 卡片阴影
    },
    Table: {
      borderRadius: 8, // 表格圆角
      headerBg: '#f0fdf4' // 表头背景
    },
    Input: {
      borderRadius: 6, // 输入框圆角
      activeBorderColor: '#10b981' // 激活边框色
    },
    Select: {
      borderRadius: 6 // 选择器圆角
    },
    Modal: {
      borderRadius: 12 // 模态框圆角
    },
    Drawer: {
      borderRadius: 12 // 抽屉圆角
    }
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={greenTheme}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>
)
