
import React, { useState } from 'react';
import { TimeRange } from '../types';

interface SearchBoxProps {
  initialValue?: string;
  initialTimeRange?: TimeRange;
  onSearch: (query: string, timeRange: TimeRange) => void;
  isLoading?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ 
  initialValue = '', 
  initialTimeRange = '3d', 
  onSearch, 
  isLoading 
}) => {
  const [query, setQuery] = useState(initialValue);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), timeRange);
    }
  };

  const timeOptions: { label: string; value: TimeRange }[] = [
    { label: '1 天内', value: '1d' },
    { label: '3 天内', value: '3d' },
    { label: '7 天内', value: '7d' },
    { label: '30 天内', value: '30d' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <i className="fas fa-search text-gray-400 group-focus-within:text-blue-500 transition-colors"></i>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="输入话题，例如：人工智能、全球经济..."
          className="block w-full pl-12 pr-32 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-2 top-2 bottom-2 px-6 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            '立即搜索'
          )}
        </button>
      </form>
      
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm text-gray-400 mr-2">搜索范围:</span>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              disabled={isLoading}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                timeRange === opt.value
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
