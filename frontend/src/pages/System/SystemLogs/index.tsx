import { Card, Tabs } from 'antd'

import SystemLogsFull from './components/SystemLogsFull'
import SystemLogsUser from './components/SystemLogsUser'

// 系统日志父页面：使用Tabs承载两个子页面
const SystemLogs: React.FC = () => {
  return (
    <div className="w-full max-w-7xl">
      <Card>
        <Tabs
          defaultActiveKey="full"
          items={[
            {
              key: 'full',
              label: '完整日志',
              children: <SystemLogsFull />
            },
            {
              key: 'user',
              label: '用户日志',
              children: <SystemLogsUser />
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default SystemLogs
