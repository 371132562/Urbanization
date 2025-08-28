import { Button, Collapse, Empty, Input, Modal, Skeleton, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import type { ScoreEvaluationDetailListItemDto } from 'urbanization-backend/types/dto'

import RichEditor from '@/components/RichEditor'
import useScoreStore from '@/stores/scoreStore'
import { toFullPathContent } from '@/utils'

const { Panel } = Collapse
const { Text } = Typography

// 骨架屏（与评分管理列表页风格保持一致）
const DetailSkeleton = () => (
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

// 评价详情（自定义文案）列表页：按年份分组展示，仅包含综合分/匹配文案/是否存在自定义详情
const ScoreEvaluationDetailListPage = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')

  // 年份
  const years = useScoreStore(state => state.years)
  const yearsLoading = useScoreStore(state => state.yearsLoading)
  const getScoreYears = useScoreStore(state => state.getScoreYears)

  // 列表数据（评价详情-自定义文案）
  const yearDataMap = useScoreStore(state => state.evaluationDetailYearDataMap)
  const yearLoadingMap = useScoreStore(state => state.evaluationDetailYearLoadingMap)
  const setEvaluationDetailSearchTerm = useScoreStore(state => state.setEvaluationDetailSearchTerm)
  const getListByYear = useScoreStore(state => state.getEvaluationDetailListByYear)
  const yearQueryMap = useScoreStore(state => state.evaluationDetailYearQueryMap)
  const getEvaluationDetail = useScoreStore(state => state.getEvaluationDetail)
  const evaluationDetailEdit = useScoreStore(state => state.evaluationDetailEdit)
  const evaluationDetailEditLoading = useScoreStore(state => state.evaluationDetailEditLoading)

  const [activeCollapseKey, setActiveCollapseKey] = useState<string | ''>('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewTitle, setPreviewTitle] = useState('')
  const [previewContent, setPreviewContent] = useState('')

  // 初始化仅获取年份
  useEffect(() => {
    getScoreYears()
  }, [])

  // 年份变化后默认展开第一年并加载
  useEffect(() => {
    if (years && years.length > 0) {
      const firstYear = years[0]
      setActiveCollapseKey(prev => prev || String(firstYear))
      // 返回列表页时强制刷新，避免显示缓存
      const q = yearQueryMap[firstYear] || { page: 1, pageSize: 10 }
      getListByYear({
        year: firstYear,
        page: q.page,
        pageSize: q.pageSize,
        ...(searchTerm ? { searchTerm } : {})
      })
    }
  }, [years])

  // 列定义
  const columns: ColumnsType<ScoreEvaluationDetailListItemDto> = useMemo(
    () => [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        render: (text, record) => (
          <Space size={4}>
            <span>{text}</span>
            <Text type="secondary">({record.enName})</Text>
          </Space>
        )
      },
      {
        title: '综合评分',
        dataIndex: 'totalScore',
        key: 'totalScore',
        render: v => (v != null ? v.toFixed(3) : '-')
      },
      {
        title: '评价文案（来自评价体系）',
        dataIndex: 'matchedText',
        key: 'matchedText',
        render: (_: unknown, record) =>
          record.matchedText && record.matchedText.trim().length > 0 ? (
            <Button
              onClick={() => {
                setPreviewTitle(`${record.cnName}（${record.year}年）评价体系文案`)
                setPreviewContent(record.matchedText)
                setPreviewOpen(true)
              }}
            >
              查看
            </Button>
          ) : (
            <Button disabled>未匹配到评价体系</Button>
          )
      },
      {
        title: '评价详情文案',
        dataIndex: 'hasCustomDetail',
        key: 'hasCustomDetail',
        render: (_: unknown, record) =>
          record.hasCustomDetail ? (
            <Button
              loading={evaluationDetailEditLoading}
              onClick={async () => {
                await getEvaluationDetail({ year: record.year, countryId: record.countryId })
                const content = evaluationDetailEdit?.text || ''
                setPreviewTitle(`${record.cnName}（${record.year}年）自定义评价详情文案`)
                setPreviewContent(content)
                setPreviewOpen(true)
              }}
            >
              查看
            </Button>
          ) : (
            <Button disabled>未配置</Button>
          )
      },
      {
        title: '操作',
        key: 'action',
        render: (_: unknown, record) => (
          <Space>
            <Button
              type="primary"
              onClick={() =>
                navigate(`/scoreManagement/detail/modify/${record.countryId}/${record.year}`)
              }
            >
              配置评价详情
            </Button>
          </Space>
        )
      }
    ],
    []
  )

  // 编辑页跳转逻辑将于后续“编辑页”任务中实现

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setEvaluationDetailSearchTerm(value)
    const k = Array.isArray(activeCollapseKey) ? activeCollapseKey[0] : activeCollapseKey
    const activeYear = Number(k || (years && years.length > 0 ? years[0] : ''))
    if (activeYear) {
      const q = yearQueryMap[activeYear] || { page: 1, pageSize: 10 }
      getListByYear({
        year: activeYear,
        page: q.page,
        pageSize: q.pageSize,
        ...(value ? { searchTerm: value } : {})
      })
    }
  }

  const onChangePage = (year: number, page: number, pageSize?: number) => {
    getListByYear({ year, page, pageSize: pageSize || 10, ...(searchTerm ? { searchTerm } : {}) })
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex justify-between">
        <Input.Search
          placeholder="按国家名称搜索"
          allowClear
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          onSearch={handleSearch}
          style={{ width: 300 }}
        />
      </div>
      {yearsLoading ? (
        <DetailSkeleton />
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
              getListByYear({
                year,
                page: q.page,
                pageSize: q.pageSize,
                ...(searchTerm ? { searchTerm } : {})
              })
            }
          }}
        >
          {(years || []).map(year => {
            const yearData = yearDataMap[year]
            const loading = yearLoadingMap[year]
            const dataSource = yearData?.data || []
            return (
              <Panel
                header={<span className="text-base font-semibold">{year}年</span>}
                key={String(year)}
              >
                <Table<ScoreEvaluationDetailListItemDto>
                  columns={columns}
                  dataSource={dataSource}
                  rowKey={r => `${r.countryId}-${r.year}`}
                  pagination={{
                    current: yearData?.pagination.page || 1,
                    pageSize: yearData?.pagination.pageSize || 10,
                    total: yearData?.pagination.total || 0,
                    showSizeChanger: false,
                    showQuickJumper: true,
                    onChange: (page, pageSize) => onChangePage(year, page, pageSize || 10)
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
      <Modal
        title={previewTitle}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={800}
      >
        {previewContent && previewContent.trim().length > 0 ? (
          <RichEditor
            value={toFullPathContent(previewContent)}
            readOnly
            height="auto"
          />
        ) : (
          <div className="py-4 text-center text-gray-500">暂无内容</div>
        )}
      </Modal>
    </div>
  )
}

export default ScoreEvaluationDetailListPage
