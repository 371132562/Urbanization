import { Button, Input, message, Modal, Table ,Space} from 'antd';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import useArticleStore from '@/stores/articleStore';
import OrderConfigModal from './OrderConfigModal';

const { Search } = Input;

const ArticleManagement: React.FC = () => {
  const navigate = useNavigate();
  const articles = useArticleStore((state) => state.articles);
  const total = useArticleStore((state) => state.total);
  const currentPage = useArticleStore((state) => state.currentPage);
  const pageSize = useArticleStore((state) => state.pageSize);
  const loading = useArticleStore((state) => state.loading);
  const getArticleList = useArticleStore((state) => state.getArticleList);
  const setSearchTitle = useArticleStore((state) => state.setSearchTitle);
  const deleteArticle = useArticleStore((state) => state.deleteArticle);
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    getArticleList(1, 10, '');
  }, [getArticleList]);

  const handleSearch = (value: string) => {
    setSearchTitle(value);
    getArticleList(1, pageSize, value);
  };

  const handleTableChange = (pagination: any) => {
    getArticleList(pagination.current, pagination.pageSize);
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: '确定要删除这篇文章吗？',
      content: '此操作不可恢复。',
      onOk: async () => {
        const success = await deleteArticle(id);
        if (success) {
          message.success('文章删除成功');
        } else {
          message.error('文章删除失败');
        }
      },
    });
  };

  const columns = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      key: 'updateTime',
      render: (text: string) => new Date(text).toLocaleString(),
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <span>
          <Button
            type="link"
            onClick={() => navigate(`/article/modify/${record.id}`)}
          >
            编辑
          </Button>
          <Button type="link" danger onClick={() => handleDelete(record.id)}>
            删除
          </Button>
        </span>
      ),
    },
  ];

  return (
    <div className="w-full max-w-7xl">
      <div className="flex justify-between mb-4">
      <Search
          placeholder="请输入标题搜索"
          onSearch={handleSearch}
          style={{ width: 200 }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => navigate('/article/create')}
          >
            新增文章
          </Button>
          <Button onClick={() => setIsModalVisible(true)}>
            配置文章顺序
          </Button>
        </Space>

      </div>
      <Table
        columns={columns}
        dataSource={articles}
        rowKey="id"
        pagination={{
          total,
          current: currentPage,
          pageSize,
          showSizeChanger: true,
        }}
        loading={loading}
        onChange={handleTableChange}
      />
      {isModalVisible && (
        <OrderConfigModal
          visible={isModalVisible}
          onClose={() => setIsModalVisible(false)}
        />
      )}
    </div>
  );
};

export const Component = ArticleManagement
