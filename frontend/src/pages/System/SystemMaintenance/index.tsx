import { Card } from 'antd'
import { FC } from 'react'

import OrphanImages from './OrphanImages'

// 系统维护总览页：内嵌各运维功能组件，统一页面承载
const SystemMaintenance: FC = () => {
  return (
    <div className="w-full max-w-6xl">
      <div className="space-y-6">
        <Card title="孤立图片清理">
          <OrphanImages />
        </Card>

        {/* 未来更多运维功能可在此以 Card 形式堆叠 */}
        {/* <Card title="数据一致性校验">...</Card> */}
      </div>
    </div>
  )
}

export default SystemMaintenance
