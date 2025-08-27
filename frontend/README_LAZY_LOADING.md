# React Router v7 + Vite 懒加载与代码分割说明

## 概述
- 已全面启用基于 React.lazy + Suspense 的路由懒加载，默认导出页面组件。
- 在个别路由上引入 React Router v7 的 `route.lazy`，以便更细粒度验证与对比懒加载行为（当前示例：`/article/list`）。
- 路由生成时使用统一的加载骨架屏组件 `src/components/LoadingFallback`。
- Vite 构建启用手动分包（manualChunks），按第三方依赖与功能模块/子模块多维度拆分，避免把未访问页面打入首屏。

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
当前 `vite.config.ts` 将第三方依赖细分为多个 `vendor_*`，并将业务按模块/子模块拆分为更小的可缓存块；同时明确避免将所有 `pages/` 归并到一个通用块里（否则会把首页与其它页面打到一起，影响首屏）。

核心策略如下：
- 第三方依赖优先拆包：
  - `vendor_router`, `vendor_history`, `vendor_react`, `vendor_antd`, `vendor_ant_design`, `vendor_rc`, `vendor_echarts`, `vendor_zustand`, `vendor_axios`, `vendor`
- 业务模块更细颗粒度拆包（举例）：
  - 系统管理：`system-user-management`, `system-role-management`, `system-maintenance`
  - 数据管理：`data-management-import`, `data-management-export`, `data-management-modify`, `data-management`
  - 评分管理：`score-management-import`, `score-management-export`, `score-management-modify`, `score-management-detail`, `score-management-evaluation`, `score-management`
  - 文章管理：`article-management-modify`, `article-management-order`, `article-management`
  - 评估模型：`evaluation-model-weight`, `evaluation-model-formula-detail`, `evaluation-model`
  - 地图相关：`map-urbanization-rate`, `map-edit`, `map-components`
  - 其他页面：`transform-formula`, `transform-data-list`, `home`, `human-dynamics`, `material-dynamics`, `spatial-dynamics`, `urbanization-process`

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

      // 系统管理
      if (id.includes('System/UserManagement')) return 'system-user-management'
      if (id.includes('System/RoleManagement')) return 'system-role-management'
      if (id.includes('System/SystemMaintenance')) return 'system-maintenance'

      // 数据管理（细分）
      if (id.includes('DataManagement/Import')) return 'data-management-import'
      if (id.includes('DataManagement/Export')) return 'data-management-export'
      if (id.includes('DataManagement/Modify')) return 'data-management-modify'
      if (id.includes('DataManagement')) return 'data-management'

      // 评分管理（细分）
      if (id.includes('ScoreManagement/Import')) return 'score-management-import'
      if (id.includes('ScoreManagement/Export')) return 'score-management-export'
      if (id.includes('ScoreManagement/Modify')) return 'score-management-modify'
      if (id.includes('ScoreManagement/Detail')) return 'score-management-detail'
      if (id.includes('ScoreManagement/Evaluation')) return 'score-management-evaluation'
      if (id.includes('ScoreManagement')) return 'score-management'

      // 文章管理（细分）
      if (id.includes('ArticleManagement/Modify')) return 'article-management-modify'
      if (id.includes('ArticleManagement/OrderConfig')) return 'article-management-order'
      if (id.includes('ArticleManagement')) return 'article-management'

      // 评估模型（细分）
      if (id.includes('EvaluationModel/WeightManagement')) return 'evaluation-model-weight'
      if (id.includes('EvaluationModel/FormulaDetail')) return 'evaluation-model-formula-detail'
      if (id.includes('EvaluationModel')) return 'evaluation-model'

      // 地图相关（细分）
      if (id.includes('Map/UrbanizationRate')) return 'map-urbanization-rate'
      if (id.includes('Map/MapEdit')) return 'map-edit'
      if (id.includes('Map/')) return 'map-components'

      // 其他
      if (id.includes('Transform/Formula')) return 'transform-formula'
      if (id.includes('Transform/dataList')) return 'transform-data-list'
      if (id.includes('pages/Home')) return 'home'
      if (id.includes('pages/HumanDynamics')) return 'human-dynamics'
      if (id.includes('pages/MaterialDynamics')) return 'material-dynamics'
      if (id.includes('pages/SpatialDynamics')) return 'spatial-dynamics'
      if (id.includes('pages/UrbanizationProcess')) return 'urbanization-process'
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
- 业务块细分：如 `data-management-*`、`score-management-*`、`article-management-*` 等仅在访问对应子功能时加载。
- 地图相关体积仍较大：建议继续精细化引入与二级懒加载。

### 建议的进一步优化
- ECharts 按需引入：仅注册用到的图表/组件，避免引入完整包。
- 地图页二级懒加载：将非首屏图表与重型逻辑拆分为更细的懒加载单元。
- 地理数据懒加载并缓存：GeoJSON 等大数据改为运行时拉取并缓存。
- 预取策略：对高频路由添加 prefetch / preload 或基于角色的登陆后预取（谨慎开启，避免误触首屏加载）。

## 使用规范
1) 新增页面：默认导出组件，并在 `routesConfig.tsx` 使用 `lazy(() => import('...'))`。
2) 懒加载路径需为静态字符串，便于 Vite 正确分包。
3) 大依赖尽量按需加载，必要时新增专属 `vendor_*` 分包规则。
4) 路由组件只导出组件，避免在同文件导出非组件逻辑（利于 HMR 与构建优化）。

## 故障排除
- 懒加载白屏：检查默认导出是否正确、导入路径是否存在。
- 路由不渲染：确认 `RouteItem.component` 是否为有效的 React 组件。
- 体积异常：执行 `pnpm build` 查看 dist 产物并优化 manualChunks 规则。
