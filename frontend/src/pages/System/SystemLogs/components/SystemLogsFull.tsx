import { QuestionCircleOutlined } from '@ant-design/icons'
import {
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Skeleton,
  Space,
  Table,
  Tooltip,
  Typography
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useMemo, useState } from 'react'

import { useSystemLogsStore } from '@/stores/systemLogsStore'
const { Text } = Typography
/**
 * 完整日志页面组件
 *
 * 功能说明：
 * - 查看系统级别的日志文件
 * - 支持关键词搜索和时间范围过滤
 * - 专注于UI展示，数据逻辑由store处理
 */
const SystemLogsFull: React.FC = () => {
  // ==================== 表单状态 ====================
  /** 表单实例，用于管理表单数据和验证 */
  const [form] = Form.useForm()

  // ==================== 实时表单值监听 ====================
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
  /** 文件列表加载状态 */
  const filesLoading = useSystemLogsStore(state => state.filesLoading)
  /** 日志内容加载状态 */
  const contentLoading = useSystemLogsStore(state => state.contentLoading)
  /** 系统日志读取结果 */
  const readResult = useSystemLogsStore(state => state.readResult)
  /** 系统日志文件选项（用于Select组件） */
  const fileOptions = useSystemLogsStore(state => state.fileOptions)
  /** 读取系统日志方法 */
  const readLog = useSystemLogsStore(state => state.readLog)
  /** 带防抖的文件列表刷新方法 */
  const refreshFilesWithDebounce = useSystemLogsStore(state => state.refreshFilesWithDebounce)

  // ==================== 本地状态 ====================
  /** 表格数据源，从store的readResult转换而来 */
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
      filtered = filtered.filter(item => item.message.toLowerCase().includes(keywordLower))
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
   * 自动查询日志
   * 当文件名选择后自动调用查询接口
   */
  const autoFetchLogs = async () => {
    if (!filename) {
      return // 没有选择文件，不执行查询
    }

    // 调用store方法读取日志
    await readLog({ filename })
  }

  // ==================== 副作用处理 ====================
  /**
   * 同步store数据到表格
   * 当readResult更新时，转换为表格需要的格式
   */
  useEffect(() => {
    if (readResult) {
      const rows = (readResult || []).map((l, idx) => ({
        key: `${idx}`,
        ts: l.ts,
        message: l.message
      }))
      setDataSource(rows)
    } else {
      // 如果readResult为空（例如，切换文件后），清空表格
      setDataSource([])
    }
  }, [readResult])

  /**
   * 组件初始化
   * 加载文件列表
   */
  useEffect(() => {
    refreshFilesWithDebounce(true)
  }, [refreshFilesWithDebounce])

  /**
   * 自动查询日志
   * 当文件名变化时自动查询
   */
  useEffect(() => {
    autoFetchLogs()
  }, [filename])

  // ==================== 渲染 ====================
  return (
    <div className="w-full max-w-7xl">
      {/* 查询条件卡片 */}
      <Card
        title={
          <Space align="center">
            完整日志
            <Tooltip
              title={
                <div>
                  <p>
                    <strong>功能说明：</strong>
                  </p>
                  <p>• 查看完整的日志文件内容（不区分用户）</p>
                  <p>• 支持关键词搜索和高亮显示</p>
                  <p>• 支持时间范围过滤</p>
                  <p>
                    <strong>操作步骤：</strong>
                  </p>
                  <p>1. 选择日志文件</p>
                  <p>2. 输入关键词（可选）</p>
                  <p>3. 选择时间范围（可选）</p>
                  <p>4. 系统自动查询并显示结果</p>
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
            name="filename"
            label="日志文件"
            className="!mb-2"
          >
            <Select
              loading={filesLoading}
              showSearch
              allowClear
              placeholder="选择日志文件"
              style={{ width: 260 }}
              options={fileOptions}
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
            columns={
              columns as Array<{
                title: string
                dataIndex: string
                key: string
                width?: number
              }>
            }
            dataSource={filteredDataSource}
          />
        )}
      </Card>
    </div>
  )
}

export default SystemLogsFull
