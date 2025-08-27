import { DeleteOutlined, MenuOutlined } from '@ant-design/icons'
import {
  closestCenter,
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, message, Modal, Select, Skeleton, Space, Tabs } from 'antd'
import React, { useEffect, useState } from 'react'
import type { ArticleItem, ArticleMetaItem } from 'urbanization-backend/types/dto'
import { v4 as uuidv4 } from 'uuid'

import ArticleDisplay from '@/components/ArticleDisplay'
import useArticleStore from '@/stores/articleStore'

// SortableItem 组件
interface SortableItemProps {
  id: string
  article: ArticleItem & { uniqueId: string }
  allArticles: ArticleMetaItem[]
  selectedArticleIds: Set<string>
  onSelect: (uniqueId: string, articleId: string) => void
  onRemove: (uniqueId: string) => void
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  article,
  allArticles,
  selectedArticleIds,
  onSelect,
  onRemove
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center space-x-2 rounded-md border bg-gray-50 p-2"
    >
      <Button
        type="text"
        icon={<MenuOutlined />}
        {...listeners}
        className="cursor-grab"
      />
      <Select
        showSearch
        value={article.id || undefined}
        placeholder="请选择一篇文章"
        style={{ flex: 1 }}
        onChange={value => onSelect(article.uniqueId, value)}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        options={allArticles.map(a => ({
          value: a.id,
          label: a.title,
          disabled: selectedArticleIds.has(a.id) && a.id !== article.id
        }))}
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onRemove(article.uniqueId)}
      />
    </div>
  )
}

const PAGES = [
  { key: 'home', label: '首页' },
  { key: 'urbanizationProcess', label: '城镇化进程' },
  { key: 'humanDynamics', label: '人口迁徙动力' },
  { key: 'materialDynamics', label: '经济发展动力' },
  { key: 'spatialDynamics', label: '空间发展动力' }
]

const OrderConfig = () => {
  const allArticles = useArticleStore(state => state.allArticles)
  const pageArticles = useArticleStore(state => state.pageArticles)
  const orderConfigLoading = useArticleStore(state => state.orderConfigLoading)
  const submitLoading = useArticleStore(state => state.submitLoading)
  const previewArticles = useArticleStore(state => state.previewArticles)
  // const previewLoading = useArticleStore(state => state.previewLoading)
  const getAllArticles = useArticleStore(state => state.getAllArticles)
  const getArticlesByPage = useArticleStore(state => state.getArticlesByPage)
  const upsertArticleOrder = useArticleStore(state => state.upsertArticleOrder)
  const getArticleDetailsByIds = useArticleStore(state => state.getArticleDetailsByIds)

  const [activePage, setActivePage] = useState(PAGES[0].key)
  const [selectedArticles, setSelectedArticles] = useState<(ArticleItem & { uniqueId: string })[]>(
    []
  )
  const [previewVisible, setPreviewVisible] = useState(false)

  useEffect(() => {
    getAllArticles()
  }, [getAllArticles])

  useEffect(() => {
    if (activePage) {
      getArticlesByPage(activePage)
    }
  }, [activePage, getArticlesByPage])

  useEffect(() => {
    setSelectedArticles(pageArticles.map(article => ({ ...article, uniqueId: uuidv4() })))
  }, [pageArticles])

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setSelectedArticles(items => {
        const oldIndex = items.findIndex(item => item.uniqueId === active.id)
        const newIndex = items.findIndex(item => item.uniqueId === over!.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }

  const handleAddArticle = () => {
    setSelectedArticles([
      ...selectedArticles,
      {
        id: '',
        title: '请选择一篇文章',
        content: '',
        images: [],
        createTime: new Date(),
        updateTime: new Date(),
        uniqueId: uuidv4()
      }
    ])
  }

  const handleSelectArticle = (uniqueId: string, articleId: string) => {
    const article = allArticles.find(a => a.id === articleId)
    if (article) {
      setSelectedArticles(
        selectedArticles.map(item =>
          item.uniqueId === uniqueId ? { ...item, ...article, content: item.content } : item
        )
      )
    }
  }

  const handleRemoveArticle = (uniqueId: string) => {
    setSelectedArticles(selectedArticles.filter(item => item.uniqueId !== uniqueId))
  }

  const handleSave = async () => {
    const articleIds = selectedArticles.map(item => item.id).filter(id => id)
    if (articleIds.length !== selectedArticles.length) {
      message.warning('请确保所有选项都已选择一篇文章')
      return
    }
    const success = await upsertArticleOrder(activePage, articleIds)
    if (success) {
      message.success('保存成功')
    } else {
      message.error('保存失败')
    }
  }

  const handlePreview = () => {
    const ids = selectedArticles.map(a => a.id).filter(Boolean)
    if (ids.length > 0) {
      getArticleDetailsByIds(ids)
    }
    setPreviewVisible(true)
  }

  const hasUnselectedArticles = selectedArticles.some(item => !item.id)
  const selectedArticleIds = new Set(selectedArticles.map(item => item.id).filter(Boolean))

  // 文章排序骨架屏组件
  const OrderConfigSkeleton = () => (
    <div>
      <div className="mb-4">
        <Skeleton.Input
          active
          style={{ width: 320, height: 40, marginBottom: 16 }}
        />
      </div>
      <div className="mb-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <Skeleton.Input
            key={i}
            active
            style={{ width: '100%', height: 48 }}
          />
        ))}
      </div>
      <Skeleton.Button
        active
        style={{ width: '100%', height: 40 }}
      />
    </div>
  )

  return (
    <div className="w-full max-w-4xl">
      <div className="mb-4 flex items-center justify-between">
        <div />
        <Space>
          <Button
            key="preview"
            onClick={handlePreview}
            disabled={hasUnselectedArticles || selectedArticles.length === 0}
          >
            预览
          </Button>
          <Button
            key="submit"
            type="primary"
            loading={submitLoading}
            onClick={handleSave}
          >
            保存
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activePage}
        onChange={setActivePage}
        type="card"
        items={PAGES.map(page => ({
          key: page.key,
          label: page.label
        }))}
      />
      {/* 加载时显示骨架屏 */}
      {orderConfigLoading ? (
        <OrderConfigSkeleton />
      ) : (
        <>
          <div className="min-h-[300px] rounded-md border border-gray-300 p-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={selectedArticles.map(item => item.uniqueId)}
                strategy={verticalListSortingStrategy}
              >
                <div className="mb-4 space-y-4">
                  {selectedArticles.map(article => (
                    <SortableItem
                      key={article.uniqueId}
                      id={article.uniqueId}
                      article={article}
                      allArticles={allArticles}
                      selectedArticleIds={selectedArticleIds}
                      onSelect={handleSelectArticle}
                      onRemove={handleRemoveArticle}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <Button
              type="dashed"
              onClick={handleAddArticle}
              className="w-full"
            >
              + 添加文章
            </Button>
          </div>
        </>
      )}

      <Modal
        title="预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80%"
        destroyOnClose
      >
        <ArticleDisplay articles={previewArticles} />
      </Modal>
    </div>
  )
}

export default OrderConfig
