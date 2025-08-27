# React Router v7 + Vite 懒加载与代码分割说明

## 概述
- 已全面启用基于 React.lazy + Suspense 的路由懒加载，默认导出页面组件。
- 路由生成时使用统一的加载骨架屏组件 `src/components/LoadingFallback`。
- Vite 构建启用手动分包（manualChunks），按第三方依赖与功能模块双维度拆分，显著降低业务块体积。

## 实现要点

### 1) 路由懒加载（默认导出）
在 `src/router/routesConfig.tsx` 中统一使用：
```ts
import React, { lazy } from 'react'

const ArticleManagement = lazy(() => import('@/pages/ArticleManagement'))
const UserManagement = lazy(() => import('@/pages/System/UserManagement/UserManagement'))
// ... 其余页面同理，均为默认导出
```

页面组件需使用默认导出：
```ts
// 正确
export default MyPage

// 旧写法（已迁移）
// export const Component = MyPage
```

### 2) 懒加载加载态
`src/router.tsx` 里为每个路由元素包裹 Suspense，并使用统一的骨架屏组件：
```tsx
<Suspense fallback={<LoadingFallback />}>
  <route.component />
</Suspense>
```
骨架屏组件文件：`src/components/LoadingFallback/index.tsx`。

### 3) 代码分割（manualChunks）
当前 `vite.config.ts` 中对第三方依赖与功能模块进行拆包，核心策略如下：
- 第三方依赖优先拆包：
  - `vendor_react`: react / react-dom
  - `vendor_router`: react-router 相关
  - `vendor_ant_design`: @ant-design 生态包
  - `vendor_antd`: antd 核心
  - `vendor_rc`: rc-* 组件族
  - `vendor_echarts`: echarts 相关
  - `vendor_zustand`: 状态管理
  - `vendor_axios`: axios
  - `vendor`: 其他三方兜底
- 功能模块拆包：
  - `system-user-management`, `system-role-management`, `system-maintenance`
  - `data-management`, `score-management`, `article-management`, `evaluation-model`
  - `map-components`（地图与可视化相关）
  - `other-pages`（其余页面）

配置示例（节选）：
```ts
// vite.config.ts（节选）
rollupOptions: {
  output: {
    manualChunks: id => {
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
        return 'vendor'
      }

      if (id.includes('System/UserManagement')) return 'system-user-management'
      if (id.includes('System/RoleManagement')) return 'system-role-management'
      if (id.includes('System/SystemMaintenance')) return 'system-maintenance'
      if (id.includes('DataManagement')) return 'data-management'
      if (id.includes('ScoreManagement')) return 'score-management'
      if (id.includes('ArticleManagement')) return 'article-management'
      if (id.includes('EvaluationModel')) return 'evaluation-model'
      if (id.includes('Map/')) return 'map-components'
      if (id.includes('pages/')) return 'other-pages'
    },
    chunkFileNames: 'assets/[name]-[hash].js',
    entryFileNames: 'assets/[name]-[hash].js',
    assetFileNames: 'assets/[name]-[hash][extname]'
  }
}
```

## 构建结果与优化方向

### 当前构建（示例）
- 依赖大块下沉至 `vendor_*`：如 `vendor_react`、`vendor_echarts`、`vendor_router` 等。
- 业务块明显减小：如 `article-management`、`data-management` 等从数百 KB/MB 降至数十 KB。
- 地图相关体积仍较大：`map-components` 约 ~1MB（gzip 后 ~285KB）。

### 建议的进一步优化
- ECharts 按需引入：仅注册用到的图表/组件，避免引入完整包。
- 地图页二级懒加载：将非首屏图表与重型逻辑拆分为更细的懒加载单元。
- 地理数据懒加载并缓存：GeoJSON 等大数据改为运行时拉取并缓存。
- 预取策略：对高频路由添加 prefetch / preload 或基于角色的登陆后预取。

## 使用规范
1) 新增页面：默认导出组件，并在 `routesConfig.tsx` 使用 `lazy(() => import('...'))`。
2) 懒加载路径需为静态字符串，便于 Vite 正确分包。
3) 大依赖尽量按需加载，必要时新增专属 `vendor_*` 分包规则。
4) 路由组件只导出组件，避免在同文件导出非组件逻辑（利于 HMR 与构建优化）。

## 故障排除
- 懒加载白屏：检查默认导出是否正确、导入路径是否存在。
- 路由不渲染：确认 `RouteItem.component` 是否为有效的 React 组件。
- 体积异常：执行 `pnpm build` 查看 dist 产物并优化 manualChunks 规则。
