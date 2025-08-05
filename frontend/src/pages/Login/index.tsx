import { LockOutlined, LoginOutlined, UserOutlined } from '@ant-design/icons'
import { Button, Card, Form, Input } from 'antd'
import React, { useState } from 'react'
import { useNavigate } from 'react-router'

import { useAuthStore } from '../../stores/authStore'

// 登录页组件
const LoginPage: React.FC = () => {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)
  const login = useAuthStore(s => s.login)
  const error = useAuthStore(s => s.error)
  const navigate = useNavigate()

  // 登录提交
  const onFinish = async (values: { code: string; password: string }) => {
    setSubmitting(true)
    const success = await login(values)
    setSubmitting(false)
    if (success) {
      navigate('/home')
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="animate-blob absolute -right-40 -top-40 h-80 w-80 rounded-full bg-blue-200 opacity-70 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-2000 absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-purple-200 opacity-70 mix-blend-multiply blur-xl filter"></div>
        <div className="animate-blob animation-delay-4000 absolute left-40 top-40 h-80 w-80 rounded-full bg-indigo-200 opacity-70 mix-blend-multiply blur-xl filter"></div>
      </div>

      {/* 登录卡片 */}
      <div className="relative z-10 mx-4 w-full max-w-lg">
        <Card
          className="overflow-hidden rounded-2xl border-0 bg-white/80 shadow-2xl backdrop-blur-sm"
          bodyStyle={{ padding: '2rem' }}
        >
          {/* 标题区域 */}
          <div className="mb-8 text-center">
            <h1 className="mb-2 text-2xl font-bold text-gray-800">
              城镇化发展质量评价技术示范平台
            </h1>
          </div>

          {/* 登录表单 */}
          <Form
            form={form}
            name="login"
            layout="vertical"
            onFinish={onFinish}
            autoComplete="off"
            size="large"
          >
            <Form.Item
              label="用户编号"
              name="code"
              rules={[{ required: true, message: '请输入用户编号' }]}
            >
              <Input
                prefix={<UserOutlined className="text-gray-400" />}
                placeholder="请输入用户编号"
                autoFocus
                className="rounded-lg border-gray-300 transition-colors hover:border-blue-400 focus:border-blue-500"
              />
            </Form.Item>

            <Form.Item
              label="密码"
              name="password"
              rules={[{ required: true, message: '请输入密码' }]}
            >
              <Input.Password
                prefix={<LockOutlined className="text-gray-400" />}
                placeholder="请输入密码"
                className="rounded-lg border-gray-300 transition-colors hover:border-blue-400 focus:border-blue-500"
              />
            </Form.Item>

            {/* 错误信息 */}
            {error && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
                <div className="text-center text-sm text-red-600">{error}</div>
              </div>
            )}

            {/* 登录按钮 */}
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                className="h-12 w-full transform rounded-lg border-0 bg-gradient-to-r from-blue-500 to-purple-600 text-base font-medium shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
                loading={submitting}
              >
                {submitting ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
