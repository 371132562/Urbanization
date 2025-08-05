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
          target: 'http://localhost:3333',
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
            if (id.includes('node_modules')) {
              if (id.includes('antd')) {
                return 'vendor_antd'
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor_react'
              }
              if (id.includes('echarts')) {
                return 'vendor_echarts'
              }
              if (id.includes('@ant-design')) {
                return 'vendor_ant-design'
              }
              return 'vendor'
            }
            if (id.includes('src/stores')) {
              return 'stores'
            }
            if (id.includes('src/services')) {
              return 'services'
            }
          }
        }
      }
    }
  }
})
