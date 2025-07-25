import path from 'node:path'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'
import { defineConfig } from 'vite'
// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    proxy: {
      '/urbanization': {
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
})
