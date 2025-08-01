import { Button, Empty, Skeleton } from 'antd'
import { useEffect } from 'react'
import { useNavigate } from 'react-router'

import ArticleDisplay from '@/components/ArticleDisplay'
import useArticleStore from '@/stores/articleStore'

export const Component = () => {
  const navigate = useNavigate()
  const getArticlesByPage = useArticleStore(state => state.getArticlesByPage)
  const pageArticles = useArticleStore(state => state.pageArticles)
  const orderConfigLoading = useArticleStore(state => state.orderConfigLoading)

  useEffect(() => {
    getArticlesByPage('spatialDynamics')
  }, [])

  const goToConfig = () => {
    navigate('/article/list')
  }

  if (orderConfigLoading) {
    return (
      <div className="flex h-full items-center justify-center pt-20">
        {/* 空间动力骨架屏 */}
        <Skeleton.Input
          active
          style={{ width: 320, height: 48, borderRadius: 8 }}
        />
      </div>
    )
  }

  if (!pageArticles || pageArticles.length === 0) {
    return (
      <div className="flex h-full items-center justify-center pt-20">
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="空间动力暂无内容"
        >
          <Button
            type="primary"
            onClick={goToConfig}
          >
            前往配置
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="w-full max-w-7xl">
      <ArticleDisplay articles={pageArticles} />
    </div>
  )
}
