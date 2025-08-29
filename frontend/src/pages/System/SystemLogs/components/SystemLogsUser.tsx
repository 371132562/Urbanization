import { QuestionCircleOutlined } from '@ant-design/icons'
import { Card, DatePicker, Form, Input, Select, Skeleton, Space, Table, Tooltip } from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useMemo, useState } from 'react'

import { useSystemLogsStore } from '@/stores/systemLogsStore'

/**
 * 用户日志页面组件
 *
 * 功能说明：
 * - 查看特定用户的日志文件
 * - 支持用户搜索和选择
 * - 支持关键词搜索和时间范围过滤
 * - 专注于UI展示，数据逻辑由store处理
 */
const SystemLogsUser: React.FC = () => {
  // ==================== 表单状态 ====================
  /** 表单实例，用于管理表单数据和验证 */
  const [form] = Form.useForm()

  // ==================== 实时表单值监听 ====================
  /** 实时监听用户ID变化 */
  const userId = Form.useWatch('userId', form)
  /** 实时监听文件名变化 */
  const filename = Form.useWatch('filename', form)
  /** 实时监听关键词变化 */
  const keyword = Form.useWatch('keyword', form)
  /** 实时监听时间范围变化 */
  const timeRange = Form.useWatch('timeRange', form)

  // ==================== 表格列定义 ====================
  /** 表格列配置：时间、内容 */
  const columns = useMemo(
    () => [
      { title: '时间', dataIndex: 'ts', key: 'ts', width: 200 },
      {
        title: '内容',
        dataIndex: 'message',
        key: 'message',
        render: (text: string) => {
          const keyword = form.getFieldValue('keyword')?.trim()
          if (!keyword) return text

          const parts = text.split(new RegExp(`(${keyword})`, 'gi'))
          return (
            <span>
              {parts.map((part, index) =>
                part.toLowerCase() === keyword.toLowerCase() ? (
                  <mark
                    key={index}
                    style={{ backgroundColor: '#ffd54f', padding: '2px 4px', borderRadius: '2px' }}
                  >
                    {part}
                  </mark>
                ) : (
                  part
                )
              )}
            </span>
          )
        }
      }
    ],
    [form]
  )

  // ==================== Store状态绑定 ====================
  /** 用户列表加载状态 */
  const usersLoading = useSystemLogsStore(state => state.usersLoading)
  /** 用户文件列表加载状态 */
  const userFilesLoading = useSystemLogsStore(state => state.userFilesLoading)
  /** 日志内容加载状态 */
  const contentLoading = useSystemLogsStore(state => state.contentLoading)
  /** 用户日志读取结果 */
  const readUserResult = useSystemLogsStore(state => state.readUserResult)
  /** 用户日志文件选项（用于Select组件） */
  const userFiles = useSystemLogsStore(state => state.userFiles)
  const userFileOptions = useMemo(
    () => userFiles.map(f => ({ label: f.filename, value: f.filename })),
    [userFiles]
  )
  /** 用户选项列表（用于用户选择） */
  const userOptions = useSystemLogsStore(state => state.userOptions)
  /** 读取用户日志方法 */
  const readUserLog = useSystemLogsStore(state => state.readUserLog)
  /** 搜索用户方法 */
  const listUsers = useSystemLogsStore(state => state.listUsers)
  /** 带防抖的用户文件列表刷新方法 */
  const refreshUserFilesWithDebounce = useSystemLogsStore(
    state => state.refreshUserFilesWithDebounce
  )

  // ==================== 本地状态 ====================
  /** 表格数据源，从store的readUserResult转换而来 */
  const [dataSource, setDataSource] = useState<Array<{ key: string; ts: string; message: string }>>(
    []
  )

  // ==================== 过滤后的数据源 ====================
  /** 根据关键词和时间范围过滤后的数据源 */
  const filteredDataSource = useMemo(() => {
    if (!dataSource.length) return []

    // 使用实时监听的值，确保过滤逻辑能正确响应变化
    const keywordValue = keyword?.trim()

    let filtered = dataSource

    // 关键词过滤
    if (keywordValue) {
      const keywordLower = keywordValue.toLowerCase()
      filtered = filtered.filter(item => {
        return item.message.toLowerCase().includes(keywordLower)
      })
    }

    // 时间范围过滤
    if (timeRange && timeRange.length === 2) {
      const [startTime, endTime] = timeRange
      if (startTime && endTime) {
        filtered = filtered.filter(item => {
          const logTime = dayjs(item.ts, 'YYYY-MM-DD HH:mm:ss')
          return logTime.isAfter(startTime) && logTime.isBefore(endTime)
        })
      }
    }

    return filtered
  }, [dataSource, keyword, timeRange])

  // ==================== 业务方法 ====================
  /**
   * 加载用户列表
   * 组件初始化时加载所有用户
   */
  const loadUsers = async () => {
    await listUsers()
  }

  /**
   * 自动查询用户日志
   * 当用户ID和文件名都选择后自动调用查询接口
   */
  const autoFetchLogs = async () => {
    if (!userId || !filename) {
      return // 没有选择用户或文件，不执行查询
    }

    // 调用store方法读取用户日志
    await readUserLog({ userId, filename })
  }

  // ==================== 副作用处理 ====================
  /**
   * 同步store数据到表格
   * 当readUserResult更新时，转换为表格需要的格式
   */
  useEffect(() => {
    if (readUserResult) {
      const rows = (readUserResult || []).map((l, idx) => ({
        key: `${idx}`,
        ts: l.ts,
        message: l.message
      }))
      setDataSource(rows)
    } else {
      // 如果readUserResult为空，清空表格
      setDataSource([])
    }
  }, [readUserResult])

  /**
   * 组件初始化
   * 加载用户列表
   */
  useEffect(() => {
    loadUsers()
  }, [])

  /**
   * 自动查询日志
   * 当用户ID或文件名变化时自动查询
   */
  useEffect(() => {
    autoFetchLogs()
  }, [userId, filename])

  // ==================== 事件处理 ====================
  /**
   * 用户选择改变处理
   * 清空文件选择并刷新该用户的文件列表
   */
  const handleUserChange = (userId: string | undefined) => {
    // 清空文件选择
    form.setFieldValue('filename', undefined)

    if (userId) {
      refreshUserFilesWithDebounce(userId, true)
    }
  }

  // ==================== 渲染 ====================
  return (
    <div className="w-full max-w-7xl">
      {/* 查询条件卡片 */}
      <Card
        title={
          <Space align="center">
            用户日志
            <Tooltip
              title={
                <div>
                  <p>
                    <strong>功能说明：</strong>
                  </p>
                  <p>• 查看特定用户的日志文件内容</p>
                  <p>• 支持关键词搜索和高亮显示</p>
                  <p>• 支持时间范围过滤</p>
                  <p>
                    <strong>操作步骤：</strong>
                  </p>
                  <p>1. 选择用户编号</p>
                  <p>2. 选择日志文件</p>
                  <p>3. 输入关键词（可选）</p>
                  <p>4. 选择时间范围（可选）</p>
                  <p>5. 系统自动查询并显示结果</p>
                </div>
              }
              placement="right"
            >
              <QuestionCircleOutlined
                style={{ fontSize: '20px', color: '#1890ff', marginTop: '2px' }}
              />
            </Tooltip>
          </Space>
        }
        className="!mb-4"
      >
        <Form
          form={form}
          layout="inline"
          className="flex flex-wrap items-center gap-x-4"
        >
          <Form.Item
            name="userId"
            label="用户（姓名/编号）"
            className="!mb-2"
          >
            <Select
              loading={usersLoading}
              showSearch
              allowClear
              placeholder="请选择用户或输入姓名/编号搜索"
              style={{ width: 240 }}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              onChange={handleUserChange}
              options={userOptions}
              notFoundContent="暂无用户"
            />
          </Form.Item>

          <Form.Item
            name="filename"
            label="日志文件"
            className="!mb-2"
          >
            <Select
              showSearch
              allowClear
              placeholder="选择日志文件"
              style={{ width: 260 }}
              options={userFileOptions}
              notFoundContent={userFilesLoading ? '加载中...' : '暂无日志文件'}
              disabled={!userId}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
          <Space className="w-full">
            <Form.Item
              name="keyword"
              label="关键词"
              className="!mb-2"
            >
              <Input
                allowClear
                placeholder="输入关键词"
                style={{ width: 220 }}
              />
            </Form.Item>
            <Form.Item
              name="timeRange"
              label="时间范围"
              className="!mb-2"
            >
              <DatePicker.RangePicker
                showTime={{ format: 'HH:mm:ss' }}
                format="YYYY-MM-DD HH:mm:ss"
                placeholder={['开始时间', '结束时间']}
                style={{ width: 320 }}
                allowClear
              />
            </Form.Item>
          </Space>
        </Form>
      </Card>

      {/* 日志内容表格卡片 */}
      <Card>
        {contentLoading ? (
          <Skeleton
            active
            paragraph={{ rows: 10 }}
          />
        ) : (
          <Table
            rowKey="key"
            size="small"
            virtual
            scroll={{ y: 586 }}
            pagination={false}
            columns={columns}
            dataSource={filteredDataSource}
          />
        )}
      </Card>
    </div>
  )
}

export default SystemLogsUser
