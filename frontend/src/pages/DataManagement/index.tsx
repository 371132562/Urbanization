/* 数据管理列表页 */
import { DownloadOutlined, FormOutlined } from '@ant-design/icons'
import { useDebounce } from 'ahooks'
import { Collapse, Input, Spin, Table } from 'antd'
import { useEffect, useMemo, useState } from 'react'
import type { CountryData, IndicatorValue, YearData } from 'urbanization-backend/types/dto'

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
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 400 })

  useEffect(() => {
    getDataManagementList()
  }, [getDataManagementList])

  const countryTableColumns = [
    {
      title: '国家',
      dataIndex: 'cnName',
      key: 'cnName'
    }
  ]

  const indicatorTableColumns = [
    {
      title: '指标中文名',
      dataIndex: 'cnName',
      key: 'cnName'
    },
    {
      title: '指标英文名',
      dataIndex: 'enName',
      key: 'enName'
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value'
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
            header={<span className="text-base font-semibold">{yearData.year}年</span>}
            key={yearData.year}
          >
            <Table
              columns={countryTableColumns}
              dataSource={yearData.data}
              rowKey="enName"
              expandable={{
                expandedRowRender: (record: CountryData) => (
                  <Table
                    columns={indicatorTableColumns}
                    dataSource={record.values}
                    rowKey={(record: IndicatorValue) => `${record.cnName}-${record.enName}`}
                    pagination={false}
                  />
                )
              }}
              pagination={false}
            />
          </Panel>
        ))}
      </Collapse>
    </div>
  )
}

export const Component = DataManagement
