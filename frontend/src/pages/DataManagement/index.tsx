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
import type { CountryData, PaginatedYearData } from 'urbanization-backend/types/dto'

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
  const years = useDataManagementStore(state => state.years)
  const yearsLoading = useDataManagementStore(state => state.yearsLoading)
  const yearDataMap = useDataManagementStore(state => state.yearDataMap)
  const yearLoadingMap = useDataManagementStore(state => state.yearLoadingMap)
  const yearQueryMap = useDataManagementStore(state => state.yearQueryMap)
  const getYears = useDataManagementStore(state => state.getDataManagementYears)
  const getListByYear = useDataManagementStore(state => state.getDataManagementListByYear)
  const setGlobalSearchTerm = useDataManagementStore(state => state.setGlobalSearchTerm)
  const deleteData = useDataManagementStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  // 每个年份的排序独立维护
  const [yearSortMap, setYearSortMap] = useState<
    Record<number, { field: string | null; order: 'asc' | 'desc' | null }>
  >({})
  const [activeCollapseKey, setActiveCollapseKey] = useState<string | ''>('')
  const navigate = useNavigate()

  // 首次加载仅获取年份；拿到年份后默认展开第一年，并加载该年的第一页
  useEffect(() => {
    getYears()
  }, [])

  // 年份变化后，设置默认展开项并加载数据
  useEffect(() => {
    if (years && years.length > 0) {
      const firstYear = years[0]
      setActiveCollapseKey(prev => prev || String(firstYear))
      // 如果第一年尚未加载，则加载
      if (!yearDataMap[firstYear]) {
        const q = yearQueryMap[firstYear] || { page: 1, pageSize: 10 }
        getListByYear({
          year: firstYear,
          page: q.page,
          pageSize: q.pageSize,
          ...(yearSortMap[firstYear]?.field && yearSortMap[firstYear]?.order
            ? {
                sortField: yearSortMap[firstYear]!.field!,
                sortOrder: yearSortMap[firstYear]!.order!
              }
            : {}),
          ...(searchTerm ? { searchTerm } : {})
        })
      }
    }
  }, [years])

  // 处理删除后仅刷新当前年份
  const handleDelete = async (record: CountryData) => {
    const success = await deleteData({ countryId: record.id, year: record.year })
    if (success) {
      message.success('删除成功')
      const q = yearQueryMap[record.year] || { page: 1, pageSize: 10 }
      // 若删除后该页为空，需要回退一页（由后端总数变化后我们在前端自行回退）
      const current = yearDataMap[record.year]
      const remainingCount = (current?.data?.length || 0) - 1
      const totalPages = Math.ceil(((current?.pagination.total || 1) - 1) / (q.pageSize || 10))
      const nextPage =
        remainingCount === 0 && (q.page || 1) > 1
          ? Math.min((q.page || 1) - 1, totalPages)
          : q.page || 1
      getListByYear({
        year: record.year,
        page: nextPage,
        pageSize: q.pageSize || 10,
        ...(yearSortMap[record.year]?.field && yearSortMap[record.year]?.order
          ? {
              sortField: yearSortMap[record.year]!.field!,
              sortOrder: yearSortMap[record.year]!.order!
            }
          : {}),
        ...(searchTerm ? { searchTerm } : {})
      })
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
        dataIndex: indicator.enName,
        key: indicator.enName,
        width: 150,
        render: (_: any, record: CountryData) => {
          const foundIndicator = record.indicators?.find(ind => ind.enName === indicator.enName)
          const value = foundIndicator?.value
          return value !== null && value !== undefined ? value : ''
        },
        sorter: true,
        // 注意：sortOrder 需要依据当前展开的年份来读取对应的排序状态
        sortOrder: undefined as SortOrder | undefined
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

  // 处理某一年的分页变化
  const handleYearPaginationChange = (year: number, page: number, pageSize: number) => {
    const sort = yearSortMap[year]
    getListByYear({
      year,
      page,
      pageSize,
      ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
      ...(searchTerm ? { searchTerm } : {})
    })
  }

  // 处理排序变化（仅对触发排序的年份生效）
  const handleTableChange =
    (year: number) => (_pagination: any, _filters: any, sorter: any, extra: any) => {
      if (extra && extra.action === 'sort') {
        const orderVal =
          sorter && sorter.order === 'ascend'
            ? 'asc'
            : sorter && sorter.order === 'descend'
              ? 'desc'
              : null
        const fieldVal = orderVal ? (sorter.field as string) : null
        const newSortState = { field: fieldVal, order: orderVal as 'asc' | 'desc' | null }
        setYearSortMap(prev => ({ ...prev, [year]: newSortState }))
        const q = yearQueryMap[year] || { page: 1, pageSize: 10 }
        getListByYear({
          year,
          page: 1,
          pageSize: q.pageSize,
          ...(newSortState.field && newSortState.order
            ? { sortField: newSortState.field, sortOrder: newSortState.order }
            : {}),
          ...(searchTerm ? { searchTerm } : {})
        })
      }
    }

  // 搜索：重置store的全局搜索词并清空已加载年份数据，再仅对当前展开的年份重新拉取
  const handleSearch = async (value: string) => {
    setSearchTerm(value)
    setGlobalSearchTerm(value)
    const k = Array.isArray(activeCollapseKey) ? activeCollapseKey[0] : activeCollapseKey
    const activeYear = Number(k || (years && years.length > 0 ? years[0] : ''))
    if (activeYear) {
      const q = yearQueryMap[activeYear] || { page: 1, pageSize: 10 }
      const sort = yearSortMap[activeYear]
      getListByYear({
        year: activeYear,
        page: q.page,
        pageSize: q.pageSize,
        ...(sort?.field && sort?.order ? { sortField: sort.field, sortOrder: sort.order } : {}),
        ...(value ? { searchTerm: value } : {})
      })
    }
  }

  // 渲染每个年份的列，需要把当前年份的排序状态传入以计算列头sortOrder
  const getColumnsForYear = (year: number) => {
    const sort = yearSortMap[year]
    return countryTableColumns?.map(col => {
      if (
        'key' in (col || {}) &&
        (col as any).key &&
        DETAILED_INDICATORS.some(di => di.enName === (col as any).key)
      ) {
        const key = (col as any).key as string
        const sortOrder =
          sort?.field === key
            ? sort?.order === 'asc'
              ? 'ascend'
              : sort?.order === 'desc'
                ? 'descend'
                : undefined
            : undefined
        return { ...col, sortOrder } as any
      }
      return col
    })
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

      {yearsLoading ? (
        <DataManagementSkeleton />
      ) : years && years.length > 0 ? (
        <Collapse
          accordion
          activeKey={activeCollapseKey}
          onChange={key => {
            const k = Array.isArray(key) ? key[0] : key
            setActiveCollapseKey(k as string)
            const year = Number(k)
            if (year && !yearDataMap[year]) {
              const q = yearQueryMap[year] || { page: 1, pageSize: 10 }
              const sort = yearSortMap[year]
              getListByYear({
                year,
                page: q.page,
                pageSize: q.pageSize,
                ...(sort?.field && sort?.order
                  ? { sortField: sort.field, sortOrder: sort.order }
                  : {}),
                ...(searchTerm ? { searchTerm } : {})
              })
            }
          }}
        >
          {years.map((year: number) => {
            const yearData: PaginatedYearData | undefined = yearDataMap[year]
            const loading = yearLoadingMap[year]
            return (
              <Panel
                header={<span className="text-base font-semibold">{year}年</span>}
                key={String(year)}
              >
                <Table
                  columns={getColumnsForYear(year)}
                  dataSource={yearData?.data || []}
                  rowKey="id"
                  onChange={handleTableChange(year)}
                  pagination={{
                    current: yearData?.pagination.page || 1,
                    pageSize: yearData?.pagination.pageSize || 10,
                    total: yearData?.pagination.total || 0,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    onChange: (page, pageSize) =>
                      handleYearPaginationChange(year, page, pageSize || 10)
                  }}
                  loading={loading}
                  scroll={{ x: 'max-content' }}
                />
              </Panel>
            )
          })}
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
