/* 评分管理列表页 */
import { FormOutlined, UploadOutlined } from '@ant-design/icons'
import { useDebounce } from 'ahooks'
import { Button, Collapse, Empty, Input, message, Popconfirm, Skeleton, Space, Table, Tag } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { CountryScoreData, YearScoreData } from 'urbanization-backend/types/dto'

import FeatureButton from '@/components/FeatureButton'
import { SCORE_DIMENSIONS } from '@/config/dataImport'
import useScoreStore from '@/stores/scoreStore'
import { filterDataByCountry } from '@/utils'

const { Panel } = Collapse
const { Search } = Input

const ScoreManagementSkeleton = () => (
  <div>
    <div className="mb-4 flex">
      <Skeleton.Button active style={{ width: 280, height: 96, marginRight: 24 }} />
      <Skeleton.Button active style={{ width: 280, height: 96, marginRight: 24 }} />
      <Skeleton.Button active style={{ width: 280, height: 96 }} />
    </div>
    <div className="mb-4">
      <Skeleton.Input active style={{ width: 320 }} />
    </div>
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="rounded-lg border border-gray-200">
          <div className="border-b border-gray-200 p-4">
            <Skeleton.Input style={{ width: '100px' }} active size="small" />
          </div>
          <div className="p-4">
            <Skeleton active title={false} paragraph={{ rows: 3, width: '100%' }} />
          </div>
        </div>
      ))}
    </div>
  </div>
)

const ScoreManagement = () => {
  const data = useScoreStore(state => state.data)
  const loading = useScoreStore(state => state.listLoading)
  const getScoreList = useScoreStore(state => state.getScoreList)
  const deleteData = useScoreStore(state => state.deleteData)

  const [searchTerm, setSearchTerm] = useState('')
  const debouncedSearchTerm = useDebounce(searchTerm, { wait: 300 })
  const navigate = useNavigate()

  useEffect(() => {
    getScoreList()
  }, [])

  const handleDelete = async (record: CountryScoreData) => {
    const success = await deleteData({ id: record.id })
    if (success) {
      message.success('删除成功')
      await getScoreList() // 重新获取列表
    } else {
      message.error('删除失败')
    }
  }

  const countryTableColumns = useMemo(() => {
    const baseColumns = [
      {
        title: '国家',
        dataIndex: 'cnName',
        key: 'cnName',
        render: (_: any, record: CountryScoreData) => (
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
      key: dim.enName
    }))

    const actionColumn = {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (_: any, record: CountryScoreData) => (
        <Space>
          <NavLink to={`/scoreManagement/modify/${record.countryId}/${dayjs(record.year).format('YYYY')}`}>
            <Button color="primary" variant="outlined">
              编辑
            </Button>
          </NavLink>
          <Popconfirm
            title="确定删除这条数据吗？"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button color="danger" variant="outlined">
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }

    return [...baseColumns, ...scoreColumns, actionColumn]
  }, [])

  const filteredData = useMemo(() => {
    return filterDataByCountry(debouncedSearchTerm, data)
  }, [debouncedSearchTerm, data])

  if (loading) {
    return <ScoreManagementSkeleton />
  }

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-4 flex">
        <FeatureButton
          className="mr-6"
          icon={<UploadOutlined className="text-[28px] text-blue-500" />}
          title="评分导入"
          description="从Excel文件导入评分数据"
          actionText="开始导入"
          color="#FF9500"
          onClick={() => {
            navigate('/scoreManagement/import')
          }}
        />
        <FeatureButton
          icon={<FormOutlined className="text-[28px] text-blue-500" />}
          title="评分录入"
          description="手动录入和编辑评分数据"
          actionText="开始录入"
          color="#34C759"
          onClick={() => {
            navigate('/scoreManagement/create')
          }}
        />
      </div>

      <div className="mb-4 flex justify-between">
        <Search
          placeholder="按国家名称搜索"
          allowClear
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 300 }}
        />
        <Button onClick={() => navigate('/scoreManagement/evaluation')}>配置评分评价</Button>
      </div>

      {filteredData.length > 0 ? (
        <Collapse accordion defaultActiveKey={filteredData[0]?.year ? String(dayjs(filteredData[0].year).year()) : ''}>
          {filteredData.map((yearData: YearScoreData) => (
            <Panel header={`${dayjs(yearData.year).year()} 年`} key={String(dayjs(yearData.year).year())}>
              <Table
                columns={countryTableColumns}
                dataSource={yearData.data}
                rowKey="id"
                pagination={false}
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