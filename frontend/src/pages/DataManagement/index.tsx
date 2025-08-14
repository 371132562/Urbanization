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
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type {
  CountryData,
  DataManagementListReqDto,
  PaginatedYearData
} from 'urbanization-backend/types/dto'

import { DETAILED_INDICATORS } from '@/config/dataImport'
import useDataManagementStore from '@/stores/dataManagementStore'
import { dayjs } from '@/utils/dayjs'

const { Panel } = Collapse
const { Search } = Input

const DataManagementSkeleton = () => (
  <div>
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
  // 使用新的分页数据状态
  const paginatedData = useDataManagementStore(state => state.paginatedData)
  const loading = useDataManagementStore(state => state.paginatedListLoading)
  const getDataManagementListPaginated = useDataManagementStore(
    state => state.getDataManagementListPaginated
  )
  const deleteData = useDataManagementStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 })
  // 存储每个年份的分页参数
  const [yearPaginationParams, setYearPaginationParams] = useState<
    Record<number, { page: number; pageSize: number }>
  >({})
  // 记录当前展开的年份
  const [activeCollapseKey, setActiveCollapseKey] = useState<string[] | ''>('')
  const navigate = useNavigate()

  // 搜索时重新加载数据
  useEffect(() => {
    if (debouncedSearchTerm !== undefined) {
      const params: DataManagementListReqDto = {
        searchTerm: debouncedSearchTerm || undefined,
        yearPaginations: Object.entries(yearPaginationParams).map(([year, pagination]) => ({
          year: Number(year),
          page: pagination.page,
          pageSize: pagination.pageSize
        }))
      }
      getDataManagementListPaginated(params)
    }
  }, [debouncedSearchTerm, yearPaginationParams])

  // 初始化年份分页参数
  useEffect(() => {
    if (paginatedData && Object.keys(yearPaginationParams).length === 0) {
      const initialParams: Record<number, { page: number; pageSize: number }> = {}
      paginatedData.forEach(yearData => {
        initialParams[yearData.year] = { page: 1, pageSize: 10 }
      })
      setYearPaginationParams(initialParams)
    }
  }, [paginatedData, yearPaginationParams])

  const handleDelete = async (record: CountryData) => {
    const success = await deleteData({
      countryId: record.id,
      year: record.year
    })
    if (success) {
      message.success('删除成功')

      // 检查删除后当前页是否还有数据，如果没有则回到前一页
      const currentYearData = paginatedData?.find(data => data.year === record.year)
      const currentPagination = yearPaginationParams[record.year]

      if (currentYearData && currentPagination) {
        const remainingCount = currentYearData.data.length - 1
        const totalPages = Math.ceil(
          (currentYearData.pagination.total - 1) / currentPagination.pageSize
        )

        // 如果当前页删除后没有数据且不是第一页，则回到前一页
        if (remainingCount === 0 && currentPagination.page > 1) {
          const newPage = Math.min(currentPagination.page - 1, totalPages)
          setYearPaginationParams(prev => ({
            ...prev,
            [record.year]: {
              ...prev[record.year],
              page: newPage
            }
          }))
        }
      }

      // 重新获取当前分页数据
      const params: DataManagementListReqDto = {
        searchTerm: debouncedSearchTerm || undefined,
        yearPaginations: Object.entries(yearPaginationParams).map(([year, pagination]) => ({
          year: Number(year),
          page: pagination.page,
          pageSize: pagination.pageSize
        }))
      }
      await getDataManagementListPaginated(params)
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
              onClick={() => navigate(`/dataManagement/modify/${record.id}/${record.year}`)}
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

  // 处理分页年份数据的分页变更
  const handleYearPaginationChange = (year: number, page: number, pageSize: number) => {
    setYearPaginationParams(prev => ({
      ...prev,
      [year]: { page, pageSize }
    }))
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

      {loading || Object.keys(yearPaginationParams).length === 0 ? (
        <DataManagementSkeleton />
      ) : paginatedData && paginatedData.length > 0 ? (
        <Collapse
          accordion
          activeKey={activeCollapseKey || paginatedData[0]?.year.toString()}
          onChange={key => {
            setActiveCollapseKey(key)
          }}
        >
          {paginatedData.map((yearData: PaginatedYearData) => (
            <Panel
              header={<span className="text-base font-semibold">{yearData.year}年</span>}
              key={yearData.year.toString()}
            >
              <Table
                columns={countryTableColumns}
                dataSource={yearData.data}
                rowKey="id"
                pagination={{
                  current: yearData.pagination.page,
                  pageSize: yearData.pagination.pageSize,
                  total: yearData.pagination.total,
                  showSizeChanger: false,
                  showQuickJumper: true,
                  onChange: (page, pageSize) =>
                    handleYearPaginationChange(yearData.year, page, pageSize || 10)
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
