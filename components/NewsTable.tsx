
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
    <div className="space-y-3">
      {/* 桌面端展示 (Table) */}
      <div className="hidden md:block overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                新闻标题
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">
                发布时间
              </th>
              <th scope="col" className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-32">
                来源
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item, index) => (
              <tr key={index} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-5">
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-900 font-medium hover:text-blue-600 transition-colors line-clamp-2"
                  >
                    {item.title}
                  </a>
                </td>
                <td className="px-6 py-5 text-sm text-gray-500 whitespace-nowrap">
                  {item.pubDate}
                </td>
                <td className="px-6 py-5 text-sm">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {item.source}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 移动端展示 (Card List) */}
      <div className="md:hidden space-y-3">
        {items.map((item, index) => (
          <div key={index} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-900 font-bold text-sm leading-snug hover:text-blue-600 active:text-blue-800 transition-colors line-clamp-3"
            >
              {item.title}
            </a>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wide">
                {item.source}
              </span>
              <span className="text-[10px] text-gray-400">
                {item.pubDate}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
