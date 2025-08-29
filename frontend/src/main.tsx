import './index.css'
import 'normalize.css'
import './assets/iconfont/iconfont.css'
import 'dayjs/locale/zh-cn'

// import { generate } from '@ant-design/colors'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import dayjs from 'dayjs'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router'

import router from './router.tsx'

dayjs.locale('zh-cn')

// 使用主色生成 Ant Design 推荐的色板，并取第 6 个颜色作为主题主色
// const colorPrimary = generate('#71add9')[5]

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          // 全局主色，由算法自动推导其它语义色
          // colorPrimary
        }
      }}
    >
      <RouterProvider router={router} />
    </ConfigProvider>
  </StrictMode>
)
