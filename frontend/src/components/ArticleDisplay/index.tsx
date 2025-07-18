import React from 'react';
import RichEditor from '../RichEditor';
import { ArticleItem } from 'urbanization-backend/types/dto';

interface ArticleDisplayProps {
  articles: ArticleItem[];
}

const ArticleDisplay: React.FC<ArticleDisplayProps> = ({ articles }) => {
  if (!articles || articles.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        当前页面暂无内容
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div
          key={article.id}
          className="bg-white rounded-lg shadow-md overflow-hidden"
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              {article.title}
            </h2>
            <div className="prose max-w-none">
              <RichEditor value={article.content} readOnly={true} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ArticleDisplay; 