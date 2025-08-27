import { Skeleton } from 'antd'
import React from 'react'

// 加载骨架屏组件：在路由懒加载时提供更友好的加载体验
const LoadingFallback: React.FC = () => {
  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <div className="mb-4">
        <Skeleton.Input
          active
          style={{ width: 240, height: 24, borderRadius: 6 }}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton
            active
            title={{ width: '40%' }}
            paragraph={{ rows: 6 }}
          />
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <Skeleton
            active
            title={{ width: '30%' }}
            paragraph={{ rows: 6 }}
          />
        </div>
      </div>
    </div>
  )
}

export default LoadingFallback
