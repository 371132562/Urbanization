/* 数据管理列表页 */
import { useDebounce } from 'ahooks'
import type { TableProps } from 'antd'
import {
  Button,
  Collapse,
  Empty,
  Input,
  message,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Tag
} from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { CountryData, YearData } from 'urbanization-backend/types/dto'

import { DETAILED_INDICATORS } from '@/config/dataImport'
import useDataManagementStore from '@/stores/dataManagementStore'
import { filterDataByCountry } from '@/utils'

const { Panel } = Collapse
const { Search } = Input

const DataManagementSkeleton = () => (
  <div>
    <div className="mb-4 flex">
      <Skeleton.Button
        active
        style={{ width: 280, height: 96, marginRight: 24 }}
      />
      <Skeleton.Button
        active
        style={{ width: 280, height: 96, marginRight: 24 }}
      />
      <Skeleton.Button
        active
        style={{ width: 280, height: 96 }}
      />
    </div>
    <div className="mb-4">
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

  const countryTableColumns = useMemo((): TableProps<CountryData>['columns'] => {
    const baseColumns: TableProps<CountryData>['columns'] = [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        fixed: 'left',
        width: 150,
        render: (_: any, record: CountryData) => (
          <div className="flex flex-col">
            <span className="truncate font-medium">{record.cnName}</span>
            <span className="truncate text-xs text-gray-500">{record.enName}</span>
          </div>
        )
      },
      {
        title: '数据完整性',
        dataIndex: 'isComplete',
        key: 'isComplete',
        fixed: 'left',
        width: 120,
        render: (isComplete: boolean) => (
          <Tag color={isComplete ? 'success' : 'warning'}>{isComplete ? '完整' : '部分缺失'}</Tag>
        )
      }
    ]

    const indicatorColumns: TableProps<CountryData>['columns'] = DETAILED_INDICATORS.map(
      indicator => ({
        title: indicator.cnName,
        dataIndex: 'indicators',
        key: indicator.enName,
        width: 150,
        render: (indicators: CountryData['indicators'] = []) => {
          const foundIndicator = indicators.find(ind => ind.enName === indicator.enName)
          const value = foundIndicator?.value
          return value !== null && value !== undefined ? value : ''
        },
        sorter: (a, b) => {
          const aIndicator = a.indicators?.find(i => i.enName === indicator.enName)
          const bIndicator = b.indicators?.find(i => i.enName === indicator.enName)
          const aValue = aIndicator?.value
          const bValue = bIndicator?.value

          if (aValue == null && bValue == null) return 0
          if (aValue == null) return 1
          if (bValue == null) return -1

          return aValue - bValue
        }
      })
    )

    const timeColumns: TableProps<CountryData>['columns'] = [
      {
        title: '创建时间',
        dataIndex: 'createTime',
        key: 'createTime',
        width: 180,
        render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
      },
      {
        title: '更新时间',
        dataIndex: 'updateTime',
        key: 'updateTime',
        width: 180,
        render: (date: Date) => dayjs(date).format('YYYY-MM-DD HH:mm:ss')
      }
    ]

    const actionColumn: TableProps<CountryData>['columns'] = [
      {
        title: '操作',
        dataIndex: 'action',
        key: 'action',
        fixed: 'right',
        width: 150,
        render: (_: any, record: CountryData) => (
          <Space>
            <Button
              color="primary"
              variant="outlined"
              onClick={() =>
                navigate(`/dataManagement/modify/${record.id}/${dayjs(record.year).format('YYYY')}`)
              }
            >
              编辑
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

    return [...baseColumns, ...indicatorColumns, ...timeColumns, ...actionColumn]
  }, [navigate])

  const filteredData = useMemo(() => {
    return filterDataByCountry(debouncedSearchTerm, data)
  }, [debouncedSearchTerm, data])

  if (loading) {
    return <DataManagementSkeleton />
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex justify-between">
        <Search
          placeholder="按国家名称搜索"
          allowClear
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
        />
      </div>

      {filteredData.length > 0 ? (
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
                pagination={{
                  pageSize: 10,
                  showSizeChanger: false
                }}
                scroll={{ x: 'max-content' }}
              />
            </Panel>
          ))}
        </Collapse>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-gray-300 p-8">
          <Empty description="暂无数据" />
        </div>
      )}
    </div>
  )
}

export const Component = DataManagement
