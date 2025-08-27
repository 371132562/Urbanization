import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig, loadEnv } from 'vite'
// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())
  // 从环境变量获取部署路径
  return {
    // 设置基础路径，如果部署在子目录下需要修改这里
    // 例如部署在 /urbanization/ 子目录下，则设置为 '/urbanization/'
    base: env.VITE_DEPLOY_PATH || '/',
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: 'http://localhost:3888',
          changeOrigin: true
        }
      }
    },
    plugins: [react(), tailwindcss(), visualizer()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src') // ✅ 必须指向 src 目录
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: id => {
            // 优先按三方依赖拆分，避免业务块过大
            if (id.includes('node_modules')) {
              if (id.includes('react-router')) return 'vendor_router'
              if (id.includes('history')) return 'vendor_history'
              if (id.includes('react') || id.includes('react-dom')) return 'vendor_react'
              if (id.includes('antd')) return 'vendor_antd'
              if (id.includes('@ant-design')) return 'vendor_ant_design'
              if (id.match(/\/(rc-[^/]+)\//)) return 'vendor_rc'
              if (id.includes('echarts')) return 'vendor_echarts'
              if (id.includes('zustand')) return 'vendor_zustand'
              if (id.includes('axios')) return 'vendor_axios'
              // 兜底第三方依赖
              return 'vendor'
            }

            // 系统管理相关组件单独打包
            if (id.includes('System/UserManagement')) {
              return 'system-user-management'
            }
            if (id.includes('System/RoleManagement')) {
              return 'system-role-management'
            }
            if (id.includes('System/SystemMaintenance')) {
              return 'system-maintenance'
            }
            // 数据管理相关组件
            if (id.includes('DataManagement')) {
              return 'data-management'
            }
            // 评分管理相关组件
            if (id.includes('ScoreManagement')) {
              return 'score-management'
            }
            // 文章管理相关组件
            if (id.includes('ArticleManagement')) {
              return 'article-management'
            }
            // 评估模型相关组件
            if (id.includes('EvaluationModel')) {
              return 'evaluation-model'
            }
            // 地图相关组件
            if (id.includes('Map/')) {
              return 'map-components'
            }
            // 其他页面组件
            if (id.includes('pages/') && !id.includes('System/')) {
              return 'other-pages'
            }
          },
          // 更友好的阈值提示，避免误报，同时指导优化
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
