import { Tabs } from 'antd'
import { FC } from 'react'

import OrphanImages from './OrphanImages'

// 系统维护总览页：采用 Tabs 承载各运维功能模块，便于信息分组与切换
const SystemMaintenance: FC = () => {
  return (
    <div className="w-full max-w-7xl">
      {/* Tabs 容器：遵循平台整体 UI 风格，突出分组标题 */}
      <Tabs
        defaultActiveKey="orphanImages"
        type="card"
        items={[
          {
            key: 'orphanImages',
            label: '孤立图片清理',
            children: <OrphanImages />
          }
          // 将来可在此扩展更多系统维护工具页签
          // {
          //   key: 'consistencyCheck',
          //   label: '数据一致性校验',
          //   children: <div className="py-4">...</div>,
          // },
        ]}
      />
    </div>
  )
}

export default SystemMaintenance
