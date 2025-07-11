import { DownloadOutlined, FormOutlined } from '@ant-design/icons'
import { useDebounce } from 'ahooks'
import { Collapse, Input, Table } from 'antd'
import { useMemo, useState } from 'react'

import FeatureButton from '@/components/FeatureButton'

const { Panel } = Collapse
const { Search } = Input

const DataManagement = () => {
  const tableColumns = [
    {
      title: '国家',
      dataIndex: 'country',
      key: 'country'
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      key: 'createdAt'
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt'
    }
  ]

  const tableData = [
    {
      key: '1',
      country: '中国',
      createdAt: '2023-01-15 10:30:00',
      updatedAt: '2023-05-20 14:00:00'
    },
    {
      key: '2',
      country: '美国',
      createdAt: '2023-02-10 11:00:00',
      updatedAt: '2023-06-25 18:45:00'
    },
    {
      key: '3',
      country: '日本',
      createdAt: '2023-03-05 09:00:00',
      updatedAt: '2023-07-11 12:10:00'
    }
  ]

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 400 })

  const filteredData = useMemo(() => {
    const term = debouncedSearchTerm.trim().toLowerCase()
    if (!term) {
      return tableData
    }
    return tableData.filter(item => item.country.toLowerCase().includes(term))
  }, [debouncedSearchTerm, tableData])

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
        defaultActiveKey={['1']}
      >
        <Panel
          header={<span className="text-base font-semibold">2023年</span>}
          key="1"
        >
          <Table
            columns={tableColumns}
            dataSource={filteredData}
            pagination={false}
          />
        </Panel>
        <Panel
          header={<span className="text-base font-semibold">2022年</span>}
          key="2"
        >
          <div className="p-4">暂无2022年数据</div>
        </Panel>
        <Panel
          header={<span className="text-base font-semibold">2021年</span>}
          key="3"
        >
          <div className="p-4">暂无2021年数据</div>
        </Panel>
      </Collapse>
    </div>
  )
}

export const Component = DataManagement
