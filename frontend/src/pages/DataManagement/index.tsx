/* 数据管理列表页 */
import { DownloadOutlined, FormOutlined } from '@ant-design/icons'
import { useDebounce } from 'ahooks'
import { Button, Collapse, Input, Spin, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { NavLink } from 'react-router'
import type { CountryData, YearData } from 'urbanization-backend/types/dto'

import FeatureButton from '@/components/FeatureButton'
import useDataManagementStore from '@/stores/dataManagementStore'

const { Panel } = Collapse
const { Search } = Input

const DataManagement = () => {
  const {
    data,
    listLoading: loading,
    getDataManagementList,
    filteredDataByCountry
  } = useDataManagementStore()
  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 })

  useEffect(() => {
    getDataManagementList()
  }, [getDataManagementList])

  const countryTableColumns = [
    {
      title: '国家',
      dataIndex: 'cnName',
      key: 'cnName'
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
        <Button type="link">
          <NavLink to={`/dataManagement/modify/${record.id}/${dayjs(record.year).format('YYYY')}`}>
            编辑
          </NavLink>
        </Button>
      )
    }
  ]

  const filteredData = useMemo(() => {
    return filteredDataByCountry(debouncedSearchTerm, data)
  }, [debouncedSearchTerm, data, filteredDataByCountry])

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Spin size="large" />
      </div>
    )
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
        />
      </div>

      <div className="mb-6">
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
