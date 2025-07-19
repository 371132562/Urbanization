import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Button, Modal, Select, Tabs, message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import useArticleStore from '@/stores/articleStore';
import { ArticleItem } from 'urbanization-backend/types/dto';
import SortableItem from './SortableItem';
import ArticleDisplay from '@/components/ArticleDisplay';

interface OrderConfigModalProps {
  visible: boolean;
  onClose: () => void;
}

const PAGES = [{ key: 'home', label: '首页' }];

const OrderConfigModal: React.FC<OrderConfigModalProps> = ({
  visible,
  onClose,
}) => {
  const allArticles = useArticleStore((state) => state.allArticles);
  const pageArticles = useArticleStore((state) => state.pageArticles);
  const orderConfigLoading = useArticleStore(
    (state) => state.orderConfigLoading,
  );
  const submitLoading = useArticleStore((state) => state.submitLoading);
  const previewArticles = useArticleStore((state) => state.previewArticles);
  const previewLoading = useArticleStore((state) => state.previewLoading);
  const getAllArticles = useArticleStore((state) => state.getAllArticles);
  const getArticlesByPage = useArticleStore((state) => state.getArticlesByPage);
  const upsertArticleOrder = useArticleStore(
    (state) => state.upsertArticleOrder,
  );
  const getArticleDetailsByIds = useArticleStore(
    (state) => state.getArticleDetailsByIds,
  );

  const [activePage, setActivePage] = useState(PAGES[0].key);
  const [selectedArticles, setSelectedArticles] = useState<
    (ArticleItem & { uniqueId: string })[]
  >([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      getAllArticles();
    }
  }, [visible, getAllArticles]);

  useEffect(() => {
    if (visible && activePage) {
      getArticlesByPage(activePage);
    }
  }, [visible, activePage, getArticlesByPage]);

  useEffect(() => {
    setSelectedArticles(
      pageArticles.map((article) => ({ ...article, uniqueId: uuidv4() })),
    );
  }, [pageArticles]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setSelectedArticles((items) => {
        const oldIndex = items.findIndex((item) => item.uniqueId === active.id);
        const newIndex = items.findIndex((item) => item.uniqueId === over!.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddArticle = () => {
    setSelectedArticles([
      ...selectedArticles,
      {
        id: '',
        title: '请选择一篇文章',
        content: '',
        createTime: new Date(),
        updateTime: new Date(),
        uniqueId: uuidv4(),
      },
    ]);
  };

  const handleSelectArticle = (uniqueId: string, articleId: string) => {
    const article = allArticles.find((a) => a.id === articleId);
    if (article) {
      setSelectedArticles(
        selectedArticles.map((item) =>
          item.uniqueId === uniqueId
            ? { ...item, ...article, content: item.content } // 保留原有的content
            : item,
        ),
      );
    }
  };

  const handleRemoveArticle = (uniqueId: string) => {
    setSelectedArticles(
      selectedArticles.filter((item) => item.uniqueId !== uniqueId),
    );
  };

  const handleSave = async () => {
    const articleIds = selectedArticles
      .map((item) => item.id)
      .filter((id) => id);
    if (articleIds.length !== selectedArticles.length) {
      message.warning('请确保所有选项都已选择一篇文章');
      return;
    }
    const success = await upsertArticleOrder(activePage, articleIds);
    if (success) {
      message.success('保存成功');
      onClose();
    } else {
      message.error('保存失败');
    }
  };

  const handlePreview = () => {
    const ids = selectedArticles.map((a) => a.id).filter(Boolean);
    if (ids.length > 0) {
      getArticleDetailsByIds(ids);
    }
    setPreviewVisible(true);
  };

  const hasUnselectedArticles = selectedArticles.some((item) => !item.id);
  const selectedArticleIds = new Set(
    selectedArticles.map((item) => item.id).filter(Boolean),
  );

  return (
    <>
      <Modal
        title="配置文章顺序"
        open={visible}
        onCancel={onClose}
        footer={[
          <Button
            key="preview"
            onClick={handlePreview}
            disabled={hasUnselectedArticles || selectedArticles.length === 0}
          >
            预览
          </Button>,
          <Button key="cancel" onClick={onClose}>
            取消
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submitLoading}
            onClick={handleSave}
          >
            保存
          </Button>,
        ]}
        width={800}
      >
        <Spin spinning={orderConfigLoading}>
          <Tabs
            activeKey={activePage}
            onChange={setActivePage}
            items={PAGES.map((page) => ({
              key: page.key,
              label: page.label,
            }))}
          />
          <div className="p-4 border rounded-md min-h-[300px]">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
             
            >
              <SortableContext
                items={selectedArticles.map((item) => item.uniqueId)}
                strategy={verticalListSortingStrategy}
             
              >
                <div className="space-y-4 mb-4">
                  {selectedArticles.map((article) => (
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
        </Spin>
      </Modal>

      <Modal
        title="预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={null}
        width="80%"
        destroyOnClose
      >
        <Spin spinning={previewLoading}>
          <ArticleDisplay articles={previewArticles} />
        </Spin>
      </Modal>
    </>
  );
};

export default OrderConfigModal; 