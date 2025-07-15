import { PlusOutlined } from '@ant-design/icons'
import { Button, Input, message, Pagination, Skeleton, Space, Table } from 'antd'
import dayjs from 'dayjs'
import { FC, useEffect } from 'react'
import type { Article } from 'urbanization-backend/types/dto'

import useArticleStore from '@/stores/articleStore'

const { Search } = Input

const ArticleManagement: FC = () => {
  const {
    articles,
    total,
    currentPage,
    pageSize,
    loading,
    searchTitle,
    getArticleList,
    setSearchTitle
  } = useArticleStore()

  // 组件加载时获取文章列表
  useEffect(() => {
    getArticleList()
  }, [getArticleList])

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchTitle(value)
    getArticleList(1, pageSize, value) // 搜索时重置到第一页
  }

  // 处理分页变化
  const handlePageChange = (page: number, pageSize?: number) => {
    getArticleList(page, pageSize)
  }

  // 处理新增文章
  const handleAddArticle = () => {
    message.info('新增文章功能正在开发中')
  }

  // 表格列定义
  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      render: (text: string) => <span className="font-medium">{text}</span>
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
      key: 'action',
      render: (_: unknown, record: Article) => (
        <Space>
          <Button
            type="primary"
            onClick={() => {
              message.info(`编辑文章: ${record.title}`)
            }}
          >
            编辑
          </Button>
          <Button
            danger
            onClick={() => {
              message.info(`删除文章: ${record.title}`)
            }}
          >
            删除
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="w-full max-w-7xl">
      <div className="mb-6 flex justify-between">
        <Search
          placeholder="请输入文章标题搜索"
          allowClear
          onSearch={handleSearch}
          style={{ width: 300 }}
          value={searchTitle}
          onChange={e => setSearchTitle(e.target.value)}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleAddArticle}
        >
          新增文章
        </Button>
      </div>

      {loading ? (
        <Skeleton active />
      ) : (
        <>
          <Table
            columns={columns}
            dataSource={articles}
            rowKey="id"
            pagination={false}
          />
          <div className="mt-4 flex justify-end">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              onChange={handlePageChange}
              showSizeChanger
              showTotal={total => `共 ${total} 条`}
            />
          </div>
        </>
      )}
    </div>
  )
}

export const Component = ArticleManagement
