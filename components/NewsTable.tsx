
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
      {/* 桌面端展示 (Table) */}
      <div className="hidden md:block overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th scope="col" className="px-4 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-12">
                #
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider">
                新闻标题
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-48">
                发布时间
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-400 uppercase tracking-wider w-32">
                来源
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {items.map((item, index) => (
              <tr 
                key={index} 
                id={`news-${index + 1}`}
                className="hover:bg-blue-50/30 transition-colors group item-highlight"
              >
                <td className="px-4 py-5 text-sm font-bold text-blue-500/50">
                   {index + 1}
                </td>
                <td className="px-6 py-5">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-900 font-semibold hover:text-blue-600 transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-6 py-5 text-sm text-gray-400 whitespace-nowrap">
                  {item.pubDate}
                </td>
                <td className="px-6 py-5 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[10px] font-black bg-gray-100 text-gray-600 uppercase tracking-tighter">
                    {item.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端展示 (Card List) */}
      <div className="md:hidden space-y-4">
        {items.map((item, index) => (
          <div 
            key={index} 
            id={`news-mobile-${index + 1}`} // 移动端也添加 ID，虽 App.tsx 默认指向 news-n，但可以通用
            className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden flex flex-col gap-3 item-highlight"
          >
            {/* 这里的 ID 设为 news-n 保证跳转一致性 */}
            <div id={`news-${index + 1}`} className="absolute -top-20"></div> 
            
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
        ))}
      </div>
    </div>
  );
};
