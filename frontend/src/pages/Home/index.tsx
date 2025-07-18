import { Button, Empty, Spin } from 'antd';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';
import ArticleDisplay from '@/components/ArticleDisplay';
import useArticleStore from '@/stores/articleStore';

export const Component = () => {
  const navigate = useNavigate();
  const getArticlesByPage = useArticleStore((state) => state.getArticlesByPage);
  const pageArticles = useArticleStore((state) => state.pageArticles);
  const isLoading = useArticleStore((state) => state.orderConfigLoading);

  useEffect(() => {
    getArticlesByPage('home');
  }, [getArticlesByPage]);

  const goToConfig = () => {
    navigate('/article-management');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Spin size="large" />
      </div>
    );
  }

  if (!pageArticles || pageArticles.length === 0) {
    return (
      <div className="flex justify-center items-center h-full pt-20">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="首页暂无内容"
        >
          <Button type="primary" onClick={goToConfig}>
            前往配置
          </Button>
        </Empty>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <ArticleDisplay articles={pageArticles} />
    </div>
  );
};
