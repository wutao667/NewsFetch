
import React, { useState, useEffect, useCallback } from 'react';
import { SearchBox } from './components/SearchBox';
import { NewsTable } from './components/NewsTable';
import { DebugView } from './components/DebugView';
import { SearchState, View, TimeRange } from './types';
import { fetchGoogleNews } from './services/newsService';
import { generateNewsSummary } from './services/geminiService';

/**
 * 一个轻量级的组件，用于将 Markdown 格式（如 **bold**）转换为带有样式的 React 元素
 */
const FormattedSummary: React.FC<{ text: string }> = ({ text }) => {
  const paragraphs = text.split('\n');

  return (
    <div className="space-y-4 text-gray-800 leading-relaxed text-base sm:text-lg">
      {paragraphs.map((para, i) => {
        if (!para.trim()) return <div key={i} className="h-2"></div>;
        const parts = para.split(/(\*\*.*?\*\*)/g);
        
        return (
          <p key={i} className="relative">
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                const innerText = part.slice(2, -2);
                const isHeading = /核心总结|时间线|演变分析|关键趋势|总结|分析/.test(innerText);
                return (
                  <strong 
                    key={j} 
                    className={`${isHeading ? 'text-blue-700 font-extrabold block mb-1 text-lg sm:text-xl' : 'text-gray-900 font-bold'}`}
                  >
                    {innerText}
                  </strong>
                );
              }
              return <span key={j}>{part}</span>;
            })}
          </p>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [history, setHistory] = useState<string[]>([]);
  
  // 实时记录当前用户在界面上选中的时间范围（即使还未点击搜索按钮）
  const [activeTimeRange, setActiveTimeRange] = useState<TimeRange>('3d');

  const [state, setState] = useState<SearchState>({
    query: '',
    timeRange: '3d',
    results: [],
    isLoading: false,
    error: null,
    summary: null,
    isSummarizing: false,
  });

  // 初始化时加载历史记录
  useEffect(() => {
    const savedHistory = localStorage.getItem('gemini_news_history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
  }, []);

  const saveToHistory = (query: string) => {
    setHistory(prev => {
      const filtered = prev.filter(q => q !== query);
      const newHistory = [query, ...filtered].slice(0, 10);
      localStorage.setItem('gemini_news_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const deleteFromHistory = (query: string) => {
    setHistory(prev => {
      const newHistory = prev.filter(q => q !== query);
      localStorage.setItem('gemini_news_history', JSON.stringify(newHistory));
      return newHistory;
    });
  };

  const clearHistory = () => {
    if (window.confirm('确定要清空所有搜索历史吗？')) {
      setHistory([]);
      localStorage.removeItem('gemini_news_history');
    }
  };

  const getTimeRangeLabel = (tr: TimeRange) => {
    const map = {
      '1d': '1 天',
      '3d': '3 天',
      '7d': '7 天',
      '30d': '30 天',
      '1y': '1 年'
    };
    return map[tr] || tr;
  };

  const handleSearch = useCallback(async (query: string, timeRange: TimeRange) => {
    // 搜索时同步更新选中的时间范围
    setActiveTimeRange(timeRange);
    
    setState(prev => ({ 
      ...prev, 
      query, 
      timeRange, 
      isLoading: true, 
      error: null, 
      summary: null 
    }));
    setView('results');
    saveToHistory(query);
    
    try {
      const news = await fetchGoogleNews(query, timeRange);
      
      setState(prev => ({ 
        ...prev, 
        results: news, 
        isLoading: false, 
        error: news.length === 0 ? `最近 ${getTimeRangeLabel(timeRange)} 内没有关于该话题的新闻，请尝试其他关键词或扩大范围。` : null 
      }));

      if (news.length > 0) {
        setState(prev => ({ ...prev, isSummarizing: true }));
        try {
          const summaryText = await generateNewsSummary(news, query);
          setState(prev => ({ ...prev, summary: summaryText, isSummarizing: false }));
        } catch (summaryErr) {
          console.error("Auto-summarize failed:", summaryErr);
          setState(prev => ({ ...prev, isSummarizing: false }));
        }
      }
    } catch (err: any) {
      console.error(err);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: err.message || '获取新闻失败，请稍后重试。' 
      }));
    }
  }, []);

  const handleSummarize = async () => {
    if (state.results.length === 0) return;
    
    setState(prev => ({ ...prev, isSummarizing: true, summary: null }));
    try {
      const summaryText = await generateNewsSummary(state.results, state.query);
      setState(prev => ({ ...prev, summary: summaryText, isSummarizing: false }));
    } catch (err) {
      setState(prev => ({ ...prev, isSummarizing: false }));
    }
  };

  const goBack = () => {
    setView('home');
    setState(prev => ({ ...prev, results: [], error: null, summary: null }));
  };

  const openDebug = () => {
    setView('debug');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fcfdfe]">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 py-3 sm:py-4 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={goBack}
          >
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg group-hover:bg-blue-700 transition-colors shadow-blue-200 shadow-lg">
              <i className="fas fa-bolt text-white text-xs sm:text-base"></i>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
              Gemini News <span className="hidden sm:inline text-blue-600">Navigator</span>
            </h1>
          </div>
          {view === 'results' && (
            <div className="hidden lg:block w-[450px]">
              <SearchBox 
                onSearch={handleSearch} 
                onTimeRangeChange={setActiveTimeRange}
                isLoading={state.isLoading} 
                initialValue={state.query} 
                initialTimeRange={activeTimeRange}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {view === 'home' && (
          <div className="max-w-4xl mx-auto text-center mt-6 sm:mt-20">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4 sm:mb-6 leading-tight">
              洞察全球，<br />
              掌握<span className="text-blue-600">即时动态</span>的热点。
            </h2>
            <p className="text-gray-500 text-base sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto">
              即时获取 Google News 资讯，支持自定义时间跨度。结合 Gemini AI 深度分析，为您提取核心要点。
            </p>
            
            <SearchBox 
              onSearch={handleSearch} 
              onTimeRangeChange={setActiveTimeRange}
              initialTimeRange={activeTimeRange}
              isLoading={state.isLoading} 
            />

            {/* 搜索历史记录 */}
            {history.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">最近搜索</span>
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                    title="清空历史"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {history.map((q, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center bg-white border border-gray-100 rounded-full shadow-sm hover:border-blue-200 transition-all"
                    >
                      <button
                        onClick={() => handleSearch(q, activeTimeRange)}
                        className="pl-3 pr-1.5 sm:pl-4 sm:pr-2 py-1 sm:py-1.5 text-gray-600 text-xs sm:text-sm hover:text-blue-600 transition-all font-medium"
                      >
                        {q}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`确定要从历史记录中删除 "${q}" 吗？`)) {
                            deleteFromHistory(q);
                          }
                        }}
                        className="pr-2.5 pl-1 py-1 sm:py-1.5 text-gray-300 hover:text-red-500 transition-colors"
                        title="删除此记录"
                      >
                        <i className="fas fa-times text-[10px]"></i>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'results' && (
          <div className="max-w-5xl mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <button 
                  onClick={goBack}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors group text-sm sm:text-base"
                >
                  <i className="fas fa-arrow-left mr-2 group-hover:-translate-x-1 transition-transform"></i> 返回
                </button>
                {!state.isLoading && state.results.length > 0 && (
                  <button
                    onClick={handleSummarize}
                    disabled={state.isSummarizing}
                    className="flex items-center gap-1.5 sm:gap-2 bg-white border border-gray-200 text-gray-700 px-3 sm:px-6 py-1.5 sm:py-3 rounded-lg sm:rounded-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-70 shadow-sm text-xs sm:text-sm font-medium"
                  >
                    {state.isSummarizing ? (
                      <><i className="fas fa-circle-notch fa-spin text-blue-500"></i> 处理中</>
                    ) : (
                      <><i className="fas fa-sync-alt"></i> 重新总结</>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 break-words">
                  搜索结果: <span className="text-blue-600">“{state.query}”</span>
                </h2>
                {!state.isLoading && state.results.length > 0 && (
                  <span className="text-sm sm:text-lg font-medium text-gray-400">
                    共 {state.results.length} 条 (过去 {getTimeRangeLabel(state.timeRange)})
                  </span>
                )}
              </div>
            </div>

            {state.error && (
              <div className="p-5 sm:p-6 bg-red-50 border border-red-200 text-red-900 rounded-xl sm:rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  <span className="font-bold text-base sm:text-lg">无法加载结果</span>
                </div>
                <p className="text-sm opacity-90">{state.error}</p>
                <div className="flex gap-3 mt-2">
                  <button 
                    onClick={() => handleSearch(state.query, state.timeRange)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    重试搜索
                  </button>
                  <button 
                    onClick={goBack}
                    className="px-4 py-2 bg-white border border-red-200 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    更换关键词
                  </button>
                </div>
              </div>
            )}

            {/* AI Summary Loading or Content */}
            {(state.isSummarizing || state.summary) && (
              <div className={`relative p-5 sm:p-8 rounded-2xl sm:rounded-3xl border transition-all duration-700 overflow-hidden ${state.isSummarizing ? 'bg-white border-gray-200 shadow-sm animate-pulse' : 'bg-white border-blue-100 shadow-xl shadow-blue-900/5'}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${state.isSummarizing ? 'bg-gray-200' : 'bg-blue-600'}`}></div>
                
                <div className="flex items-center justify-between mb-5 sm:mb-8 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`p-1.5 sm:p-2 rounded-lg ${state.isSummarizing ? 'bg-gray-100' : 'bg-blue-100 text-blue-600'}`}>
                      <i className={`fas fa-sparkles text-sm sm:text-base ${state.isSummarizing ? 'text-gray-400' : ''}`}></i> 
                    </div>
                    <h3 className={`font-bold text-base sm:text-xl ${state.isSummarizing ? 'text-gray-400' : 'text-gray-900'}`}>
                      {state.isSummarizing ? '正在深度分析...' : 'AI 洞察与舆论分析'}
                    </h3>
                  </div>
                  {state.isSummarizing && (
                    <div className="flex gap-1 sm:gap-1.5">
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  )}
                </div>
                
                {state.summary ? (
                  <div className="relative z-10">
                    <FormattedSummary text={state.summary} />
                  </div>
                ) : (
                  <div className="space-y-4 sm:space-y-6">
                    <div className="h-4 sm:h-5 bg-gray-100 rounded-full w-full"></div>
                    <div className="h-4 sm:h-5 bg-gray-100 rounded-full w-[92%]"></div>
                    <div className="h-4 sm:h-5 bg-gray-100 rounded-full w-[96%]"></div>
                    <div className="h-4 sm:h-5 bg-gray-100 rounded-full w-[85%]"></div>
                  </div>
                )}
                
                {!state.isSummarizing && (
                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-gray-50 flex items-center gap-2 text-[10px] sm:text-xs text-gray-400 font-medium italic">
                    <i className="fas fa-info-circle"></i> 以上总结由 Gemini 3 模型基于新闻标题生成。
                  </div>
                )}
              </div>
            )}

            {state.isLoading ? (
              <div className="space-y-3 sm:space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="h-16 sm:h-20 bg-white border border-gray-100 rounded-xl sm:rounded-2xl animate-pulse flex items-center px-4 sm:px-8 shadow-sm">
                    <div className="h-3 sm:h-4 bg-gray-100 rounded-full w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              state.results.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 px-2 flex items-center gap-2">
                    <i className="fas fa-list-ul text-blue-500 text-sm sm:text-base"></i> 原文列表
                  </h3>
                  <NewsTable items={state.results} />
                </div>
              )
            )}
          </div>
        )}

        {view === 'debug' && (
          <DebugView onBack={goBack} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 py-6 sm:py-10 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4 text-center">
          <p className="text-gray-400 text-xs sm:text-sm">© 2024 Gemini News Navigator. AI 总结由 Google Gemini 3 提供支持。</p>
          <button 
            onClick={openDebug}
            className="text-gray-300 hover:text-blue-500 transition-colors text-[10px] sm:text-xs flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-full"
          >
            <i className="fas fa-bug"></i> 开发者诊断模式
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
