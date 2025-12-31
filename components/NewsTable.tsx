
import React from 'react';
import { NewsItem } from '../types';

interface NewsTableProps {
  items: NewsItem[];
}

export const NewsTable: React.FC<NewsTableProps> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 sm:py-20">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full mb-4">
          <i className="fas fa-newspaper text-gray-400 text-xl sm:text-2xl"></i>
        </div>
        <p className="text-gray-500 text-base sm:text-lg">未找到相关新闻</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 桌面端表头 - 仅在 md 及以上屏幕显示 */}
      <div className="hidden md:grid grid-cols-[60px_1fr_180px_120px] gap-4 px-6 py-4 bg-gray-50/50 rounded-t-2xl border border-gray-100 border-b-0 text-xs font-bold text-gray-400 uppercase tracking-wider">
        <span>#</span>
        <span>新闻标题</span>
        <span>发布时间</span>
        <span>来源</span>
      </div>

      {/* 统一列表容器 */}
      <div className="flex flex-col gap-4 md:gap-0 md:border md:border-gray-100 md:rounded-b-2xl md:bg-white md:overflow-hidden md:divide-y md:divide-gray-50">
        {items.map((item, index) => (
          <div 
            key={index} 
            id={`news-${index + 1}`}
            className="item-highlight bg-white md:bg-transparent p-5 md:px-6 md:py-4 rounded-2xl md:rounded-none shadow-sm md:shadow-none border border-gray-100 md:border-none relative transition-colors hover:bg-blue-50/30 group"
          >
            {/* 桌面端布局: Grid 模式 */}
            <div className="hidden md:grid grid-cols-[60px_1fr_180px_120px] gap-4 items-center">
              <span className="text-sm font-bold text-blue-500/50">{index + 1}</span>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-900 font-semibold hover:text-blue-600 transition-colors line-clamp-2"
              >
                {item.title}
              </a>
              <span className="text-sm text-gray-400 whitespace-nowrap">{item.pubDate}</span>
              <div className="flex">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-600 uppercase tracking-tighter">
                  {item.source}
                </span>
              </div>
            </div>

            {/* 移动端布局: 卡片模式 */}
            <div className="md:hidden flex flex-col gap-3">
              <div className="absolute top-0 left-0 bg-blue-500 text-white text-[10px] font-black px-2 py-0.5 rounded-br-lg shadow-sm">
                #{index + 1}
              </div>
              <a 
                href={item.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-gray-900 font-bold text-base leading-snug hover:text-blue-600 active:text-blue-800 transition-colors line-clamp-3 pt-2"
              >
                {item.title}
              </a>
              <div className="flex items-center justify-between border-t border-gray-50 pt-3 mt-1">
                <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-1 rounded uppercase">
                  {item.source}
                </span>
                <span className="text-[10px] text-gray-400 font-medium">
                  {item.pubDate}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
