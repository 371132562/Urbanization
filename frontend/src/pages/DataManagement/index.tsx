/* 数据管理列表页 */
import { DownloadOutlined, FormOutlined } from '@ant-design/icons'
import { useDebounce } from 'ahooks'
import { Button, Collapse, Input, message, Popconfirm, Skeleton, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { CountryData, YearData } from 'urbanization-backend/types/dto'

import FeatureButton from '@/components/FeatureButton'
import useDataManagementStore from '@/stores/dataManagementStore'

const { Panel } = Collapse
const { Search } = Input

const DataManagementSkeleton = () => (
  <div>
    <div className="mb-8 flex">
      <Skeleton.Button
        active
        style={{ width: 280, height: 96, marginRight: 24 }}
      />
      <Skeleton.Button
        active
        style={{ width: 280, height: 96 }}
      />
    </div>
    <div className="mb-6">
      <Skeleton.Input
        active
        style={{ width: 320 }}
      />
    </div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-gray-200"
        >
          <div className="border-b border-gray-200 p-4">
            <Skeleton.Input
              style={{ width: '100px' }}
              active
              size="small"
            />
          </div>
          <div className="p-4">
            <Skeleton
              active
              title={false}
              paragraph={{ rows: 3, width: '100%' }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const DataManagement = () => {
  const data = useDataManagementStore(state => state.data)
  const loading = useDataManagementStore(state => state.listLoading)
  const getDataManagementList = useDataManagementStore(state => state.getDataManagementList)
  const filteredDataByCountry = useDataManagementStore(state => state.filteredDataByCountry)
  const deleteData = useDataManagementStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 })
  const navigate = useNavigate()

  useEffect(() => {
    getDataManagementList()
  }, [])

  const handleDelete = async (record: CountryData) => {
    const success = await deleteData({
      countryId: record.id,
      year: record.year
    })
    if (success) {
      message.success('删除成功')
      await getDataManagementList() // 重新获取列表
    } else {
      message.error('删除失败')
    }
  }

  const countryTableColumns = [
    {
      title: '国家',
      dataIndex: 'cnName',
      key: 'cnName',
      render: (_: any, record: CountryData) => `${record.cnName} (${record.enName})`
    },
    {
      title: '数据完整性',
      dataIndex: 'isComplete',
      key: 'isComplete',
      render: (isComplete: boolean) => (
        <Tag color={isComplete ? 'success' : 'warning'}>{isComplete ? '完整' : '部分缺失'}</Tag>
      )
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      key: 'createTime',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: CountryData) => (
        <Space>
          <Button
            color="primary"
            variant="outlined"
          >
            <Link to={`/dataManagement/modify/${record.id}/${dayjs(record.year).format('YYYY')}`}>
              编辑
            </Link>
          </Button>
          <Popconfirm
            title="确定删除这条数据吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button
              color="danger"
              variant="outlined"
            >
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  const filteredData = useMemo(() => {
    return filteredDataByCountry(debouncedSearchTerm, data)
  }, [debouncedSearchTerm, data, filteredDataByCountry])

  if (loading) {
    return <DataManagementSkeleton />
  }

  return (
    <div>
      <div className="mb-8 flex">
        <FeatureButton
          className="mr-6"
          icon={<DownloadOutlined className="text-[28px] text-blue-500" />}
          title="基础数据导出"
          description="导出系统中的基础数据，支持多种格式"
          actionText="立即导出"
        />
        <FeatureButton
          icon={<FormOutlined className="text-[28px] text-blue-500" />}
          title="数据录入"
          description="手动录入和编辑系统基础数据"
          actionText="开始录入"
          color="#34C759"
          onClick={() => {
            navigate('/dataManagement/create')
          }}
        />
      </div>

      <div className="mb-6 flex justify-between">
        <Search
          placeholder="按国家名称搜索"
          allowClear
          onChange={e => setSearchTerm(e.target.value)}
          className="w-80"
        />
      </div>

      <Collapse
        accordion
        defaultActiveKey={filteredData[0]?.year.toString()}
      >
        {filteredData.map((yearData: YearData) => (
          <Panel
            header={
              <span className="text-base font-semibold">
                {dayjs(yearData.year).format('YYYY')}年
              </span>
            }
            key={yearData.year.toString()}
          >
            <Table
              columns={countryTableColumns}
              dataSource={yearData.data}
              rowKey="id"
              pagination={false}
            />
          </Panel>
        ))}
      </Collapse>
    </div>
  )
}

export const Component = DataManagement
