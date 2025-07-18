import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button, Select } from 'antd';
import { MenuOutlined, DeleteOutlined } from '@ant-design/icons';
import React from 'react';
import { ArticleItem, ArticleMetaItem } from 'urbanization-backend/types/dto';

interface SortableItemProps {
  id: string;
  article: ArticleItem & { uniqueId: string };
  allArticles: ArticleMetaItem[];
  selectedArticleIds: Set<string>;
  onSelect: (uniqueId: string, articleId: string) => void;
  onRemove: (uniqueId: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({
  id,
  article,
  allArticles,
  selectedArticleIds,
  onSelect,
  onRemove,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="flex items-center space-x-2 bg-gray-50 p-2 rounded-md border"
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
        onChange={(value) => onSelect(article.uniqueId, value)}
        filterOption={(input, option) =>
          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
        }
        options={allArticles.map((a) => ({
          value: a.id,
          label: a.title,
          disabled: selectedArticleIds.has(a.id) && a.id !== article.id,
        }))}
      />
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onRemove(article.uniqueId)}
      />
    </div>
  );
};

export default SortableItem; 