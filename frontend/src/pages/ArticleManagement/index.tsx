import { PlusOutlined } from '@ant-design/icons'
import { Button, Input, message, Modal, Pagination, Skeleton, Space, Table } from 'antd'
import dayjs from 'dayjs'
import { FC, useEffect } from 'react'
import { useNavigate } from 'react-router'
import type { ArticleItem } from 'urbanization-backend/types/dto'

import useArticleStore from '@/stores/articleStore'

const { Search } = Input

const ArticleManagement: FC = () => {
  const articles = useArticleStore(state => state.articles)
  const total = useArticleStore(state => state.total)
  const currentPage = useArticleStore(state => state.currentPage)
  const pageSize = useArticleStore(state => state.pageSize)
  const loading = useArticleStore(state => state.loading)
  const searchTitle = useArticleStore(state => state.searchTitle)
  const getArticleList = useArticleStore(state => state.getArticleList)
  const setSearchTitle = useArticleStore(state => state.setSearchTitle)
  const deleteArticle = useArticleStore(state => state.deleteArticle)

  const navigate = useNavigate()

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
    navigate('/article/create')
  }

  // 处理编辑文章
  const handleEdit = (id: string) => {
    navigate(`/article/edit/${id}`)
  }

  // 处理删除文章
  const handleDelete = (record: ArticleItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `您确定要删除文章《${record.title}》吗？此操作不可撤销。`,
      okText: '确认',
      cancelText: '取消',
      onOk: async () => {
        const success = await deleteArticle(record.id)
        if (success) {
          message.success('文章删除成功')
        } else {
          message.error('文章删除失败')
        }
      }
    })
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
            onClick={() => handleEdit(record.id)}
          >
            编辑
          </Button>
          <Button
            danger
            onClick={() => handleDelete(record)}
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
