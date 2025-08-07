import { Button, Result } from 'antd'
import React from 'react'
import { useNavigate } from 'react-router'

const Forbidden: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Result
        status="403"
        title="403"
        subTitle="抱歉，您没有权限访问该页面。可联系管理员申请账号和权限。"
        extra={
          <Button
            type="primary"
            onClick={() => navigate('/')}
          >
            返回首页
          </Button>
        }
      />
    </div>
  )
}

export default Forbidden
