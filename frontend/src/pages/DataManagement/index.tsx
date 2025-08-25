/* 数据管理列表页 */
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
import type { SortOrder } from 'antd/es/table/interface'
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
  const getDataManagementList = useDataManagementStore(state => state.getDataManagementList)
  const deleteData = useDataManagementStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  // 移除 useDebounce
  // const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 })
  // 存储每个年份的分页参数
  const [yearPaginationParams, setYearPaginationParams] = useState<
    Record<number, { page: number; pageSize: number }>
  >({})
  // 记录当前展开的年份
  const [activeCollapseKey, setActiveCollapseKey] = useState<string[] | ''>('')
  // 记录排序状态，避免重新渲染时丢失
  const [sortState, setSortState] = useState<{
    field: string | null
    order: 'asc' | 'desc' | null
  }>({ field: null, order: null })
  const navigate = useNavigate()

  // 统一组装请求参数
  const buildParams = (
    yearParams: Record<number, { page: number; pageSize: number }>,
    term: string
  ): DataManagementListReqDto => ({
    searchTerm: term || undefined,
    yearPaginations: Object.entries(yearParams).map(([year, pagination]) => ({
      year: Number(year),
      page: pagination.page,
      pageSize: pagination.pageSize
    })),
    sortField: sortState.field || undefined,
    sortOrder: sortState.order || undefined
  })

  // 首次加载列表
  useEffect(() => {
    getDataManagementList({ searchTerm: undefined, yearPaginations: [] })
  }, [])

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

      // 重新获取当前分页数据（根据是否调整分页决定使用的新参数）
      let nextYearParams = yearPaginationParams
      if (currentYearData && currentPagination) {
        const remainingCount = currentYearData.data.length - 1
        const totalPages = Math.ceil(
          (currentYearData.pagination.total - 1) / currentPagination.pageSize
        )

        if (remainingCount === 0 && currentPagination.page > 1) {
          const newPage = Math.min(currentPagination.page - 1, totalPages)
          nextYearParams = {
            ...yearPaginationParams,
            [record.year]: {
              ...yearPaginationParams[record.year],
              page: newPage
            }
          }
          setYearPaginationParams(nextYearParams)
        }
      }

      await getDataManagementList(buildParams(nextYearParams, searchTerm))
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
        dataIndex: indicator.enName, // 这里使用真实指标英文名
        key: indicator.enName,
        width: 150,
        render: (_: any, record: CountryData) => {
          const foundIndicator = record.indicators?.find(ind => ind.enName === indicator.enName)
          const value = foundIndicator?.value
          return value !== null && value !== undefined ? value : ''
        },
        sorter: true,
        sortOrder: (sortState.field === indicator.enName
          ? sortState.order === 'asc'
            ? 'ascend'
            : sortState.order === 'desc'
              ? 'descend'
              : undefined
          : undefined) as SortOrder | undefined
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
  }, [navigate, sortState])

  // 处理分页年份数据的分页变更
  const handleYearPaginationChange = (year: number, page: number, pageSize: number) => {
    const next = {
      ...yearPaginationParams,
      [year]: { page, pageSize }
    }
    setYearPaginationParams(next)
    getDataManagementList(buildParams(next, searchTerm))
  }

  // 处理表格排序变化
  const handleTableChange = (pagination: any, filters: any, sorter: any, extra: any) => {
    // 仅当是排序动作时才处理，避免分页点击被误判
    if (extra && extra.action === 'sort') {
      const orderVal =
        sorter && sorter.order === 'ascend'
          ? 'asc'
          : sorter && sorter.order === 'descend'
            ? 'desc'
            : null
      const fieldVal = orderVal ? (sorter.field as string) : null
      const newSortState = {
        field: fieldVal,
        order: orderVal as 'asc' | 'desc' | null
      }

      // 重置所有年份的页码为第一页，然后重新获取数据
      const resetParams: Record<number, { page: number; pageSize: number }> = {}
      Object.entries(yearPaginationParams).forEach(([year, pagination]) => {
        resetParams[Number(year)] = { page: 1, pageSize: pagination.pageSize }
      })

      setYearPaginationParams(resetParams)
      setSortState(newSortState)

      const requestParams: DataManagementListReqDto = {
        searchTerm: searchTerm || undefined,
        yearPaginations: Object.entries(resetParams).map(([year, pagination]) => ({
          year: Number(year),
          page: pagination.page,
          pageSize: pagination.pageSize
        })),
        ...(newSortState.field && newSortState.order
          ? { sortField: newSortState.field, sortOrder: newSortState.order }
          : {})
      }

      getDataManagementList(requestParams)
    }
  }

  // Search组件onSearch事件处理
  const handleSearch = (value: string) => {
    setSearchTerm(value)
    // 搜索时重置所有年份的页码为第一页，避免搜索结果分页错乱
    const resetParams: Record<number, { page: number; pageSize: number }> = {}
    Object.entries(yearPaginationParams).forEach(([year, pagination]) => {
      resetParams[Number(year)] = { page: 1, pageSize: pagination.pageSize }
    })
    setYearPaginationParams(resetParams)
    // 搜索时清除排序状态
    setSortState({ field: null, order: null })
    getDataManagementList(buildParams(resetParams, value))
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex justify-between">
        <Search
          placeholder="按国家名称搜索"
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
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
                onChange={handleTableChange}
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
