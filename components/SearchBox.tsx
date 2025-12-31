
import React, { useState, useEffect } from 'react';
import { TimeRange } from '../types';

interface SearchBoxProps {
  initialValue?: string;
  initialTimeRange?: TimeRange;
  onSearch: (query: string, timeRange: TimeRange) => void;
  onTimeRangeChange?: (timeRange: TimeRange) => void;
  isLoading?: boolean;
}

export const SearchBox: React.FC<SearchBoxProps> = ({ 
  initialValue = '', 
  initialTimeRange = '3d', 
  onSearch, 
  onTimeRangeChange,
  isLoading 
}) => {
  const [query, setQuery] = useState(initialValue);
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange);

  // 当外部初始值改变时同步内部状态（例如点击返回首页）
  useEffect(() => {
    setTimeRange(initialTimeRange);
  }, [initialTimeRange]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), timeRange);
    }
  };

  const handleTimeRangeClick = (value: TimeRange) => {
    setTimeRange(value);
    if (onTimeRangeChange) {
      onTimeRangeChange(value);
    }
  };

  const timeOptions: { label: string; value: TimeRange }[] = [
    { label: '1天', value: '1d' },
    { label: '3天', value: '3d' },
    { label: '7天', value: '7d' },
    { label: '30天', value: '30d' },
    { label: '1年', value: '1y' },
  ];

  return (
    <div className="w-full max-w-2xl mx-auto space-y-3 sm:space-y-4">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
          <i className="fas fa-search text-gray-400 text-sm sm:text-base group-focus-within:text-blue-500 transition-colors"></i>
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索话题..."
          className="block w-full pl-9 pr-24 sm:pl-12 sm:pr-32 py-3 sm:py-4 bg-white border border-gray-200 rounded-xl sm:rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm sm:text-lg"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="absolute right-1.5 top-1.5 bottom-1.5 px-3 sm:px-6 bg-blue-600 text-white font-medium rounded-lg sm:rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs sm:text-base"
        >
          {isLoading ? (
            <i className="fas fa-spinner fa-spin"></i>
          ) : (
            '搜索'
          )}
        </button>
      </form>
      
      <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <span className="text-[10px] sm:text-sm text-gray-400 whitespace-nowrap">范围:</span>
        <div className="flex bg-gray-100 p-0.5 sm:p-1 rounded-lg sm:rounded-xl">
          {timeOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleTimeRangeClick(opt.value)}
              disabled={isLoading}
              className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-md sm:rounded-lg text-[10px] sm:text-sm font-medium transition-all whitespace-nowrap ${
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
