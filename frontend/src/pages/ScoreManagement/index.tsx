/* 评分管理列表页 */
import { Button, Collapse, Empty, Input, message, Popconfirm, Skeleton, Space, Table } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type {
  PaginatedYearScoreData,
  ScoreDataItem,
  ScoreListReqDto
} from 'urbanization-backend/types/dto'

import { SCORE_DIMENSIONS } from '@/config/dataImport'
import useScoreStore from '@/stores/scoreStore'

const { Panel } = Collapse
const { Search } = Input

const ScoreManagementSkeleton = () => (
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

const ScoreManagement = () => {
  // 使用新的分页数据状态
  const paginatedData = useScoreStore(state => state.paginatedData)
  const loading = useScoreStore(state => state.paginatedListLoading)
  const getScoreListPaginated = useScoreStore(state => state.getScoreListPaginated)
  const deleteData = useScoreStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  // 存储每个年份的分页参数
  const [yearPaginationParams, setYearPaginationParams] = useState<
    Record<number, { page: number; pageSize: number }>
  >({})
  // 记录当前展开的年份
  const [activeCollapseKey, setActiveCollapseKey] = useState<string[] | ''>('')
  const navigate = useNavigate()

  // 统一组装请求参数
  const buildParams = (
    yearParams: Record<number, { page: number; pageSize: number }>,
    term: string
  ): ScoreListReqDto => ({
    searchTerm: term || undefined,
    yearPaginations: Object.entries(yearParams).map(([year, pagination]) => ({
      year: Number(year),
      page: pagination.page,
      pageSize: pagination.pageSize
    }))
  })

  // 首次加载列表
  useEffect(() => {
    getScoreListPaginated({ searchTerm: undefined, yearPaginations: [] })
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

  const handleDelete = async (record: ScoreDataItem) => {
    const success = await deleteData({ id: record.id })
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

      await getScoreListPaginated(buildParams(nextYearParams, searchTerm))
    } else {
      message.error('删除失败')
    }
  }

  const getCountryTableColumns = (year: number) => {
    const baseColumns = [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        fixed: 'left' as const,
        width: 150,
        render: (_: any, record: ScoreDataItem) => (
          <div className="flex flex-col">
            <span className="truncate font-medium">{record.cnName}</span>
            <span className="truncate text-xs text-gray-500">{record.enName}</span>
          </div>
        )
      }
    ]

    const scoreColumns = SCORE_DIMENSIONS.map(dim => ({
      title: dim.cnName,
      dataIndex: dim.enName,
      key: dim.enName,
      width: 150,
      render: (_: any, record: ScoreDataItem) => {
        const value = record[dim.enName as keyof ScoreDataItem]
        if (typeof value === 'number') {
          return value.toFixed(2)
        }
        if (value instanceof Date) {
          return value.toLocaleDateString()
        }
        return String(value || '')
      },
      sorter: (a: ScoreDataItem, b: ScoreDataItem) => {
        const aValue = a[dim.enName as keyof ScoreDataItem] as number
        const bValue = b[dim.enName as keyof ScoreDataItem] as number
        return aValue - bValue
      }
    }))

    const actionColumn = {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      fixed: 'right' as const,
      width: 150,
      render: (_: any, record: ScoreDataItem) => (
        <Space>
          <Button
            color="primary"
            variant="outlined"
            onClick={() => {
              navigate(`/scoreManagement/modify/${record.countryId}/${year}`)
            }}
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

    return [...baseColumns, ...scoreColumns, actionColumn]
  }

  // 处理分页年份数据的分页变更
  const handleYearPaginationChange = (year: number, page: number, pageSize: number) => {
    const next = {
      ...yearPaginationParams,
      [year]: { page, pageSize }
    }
    setYearPaginationParams(next)
    getScoreListPaginated(buildParams(next, searchTerm))
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
    getScoreListPaginated(buildParams(resetParams, value))
  }

  if (loading || Object.keys(yearPaginationParams).length === 0) {
    return <ScoreManagementSkeleton />
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

      {paginatedData && paginatedData.length > 0 ? (
        <Collapse
          accordion
          activeKey={activeCollapseKey || paginatedData[0]?.year.toString()}
          onChange={key => {
            setActiveCollapseKey(key)
          }}
        >
          {paginatedData.map((yearData: PaginatedYearScoreData) => (
            <Panel
              header={<span className="text-base font-semibold">{yearData.year}年</span>}
              key={yearData.year.toString()}
            >
              <Table
                columns={getCountryTableColumns(yearData.year)}
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

export const Component = ScoreManagement
