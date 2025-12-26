
import React, { useState, useEffect, useCallback } from 'react';
import { SearchBox } from './components/SearchBox';
import { NewsTable } from './components/NewsTable';
import { DebugView } from './components/DebugView';
import { SearchState, View } from './types';
import { fetchGoogleNews } from './services/newsService';
import { generateNewsSummary } from './services/geminiService';

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [state, setState] = useState<SearchState>({
    query: '',
    results: [],
    isLoading: false,
    error: null,
    summary: null,
    isSummarizing: false,
  });

  const handleSearch = useCallback(async (query: string) => {
    // 重置状态并进入加载页
    setState(prev => ({ ...prev, query, isLoading: true, error: null, summary: null }));
    setView('results');
    
    try {
      // 1. 获取新闻列表
      const news = await fetchGoogleNews(query);
      
      // 更新新闻结果
      setState(prev => ({ 
        ...prev, 
        results: news, 
        isLoading: false, 
        error: news.length === 0 ? '最近3天内没有关于该话题的新闻，请尝试其他关键词。' : null 
      }));

      // 2. 如果有结果，自动触发 AI 总结
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
    <div className="min-h-screen flex flex-col">
      {/* Navigation Header */}
      <header className="bg-white border-b border-gray-100 py-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={goBack}
          >
            <div className="bg-blue-600 p-2 rounded-lg group-hover:bg-blue-700 transition-colors">
              <i className="fas fa-bolt text-white"></i>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">
              Gemini News <span className="text-blue-600">Navigator</span>
            </h1>
          </div>
          {view === 'results' && (
            <div className="hidden md:block w-96">
              <SearchBox onSearch={handleSearch} isLoading={state.isLoading} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {view === 'home' && (
          <div className="max-w-4xl mx-auto text-center mt-20">
            <h2 className="text-5xl font-extrabold text-gray-900 mb-6 leading-tight">
              洞察全球，<br />
              掌握<span className="text-blue-600">最近 72 小时</span>的热点。
            </h2>
            <p className="text-gray-500 text-xl mb-12 max-w-2xl mx-auto">
              即时获取 Google News 最新资讯，结合 Gemini AI 的强大分析能力，为您提取核心要点。
            </p>
            <SearchBox onSearch={handleSearch} isLoading={state.isLoading} />
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <i className="fas fa-clock text-blue-500 text-2xl mb-4"></i>
                <h3 className="font-bold text-lg mb-2">时效性优先</h3>
                <p className="text-gray-500">仅罗列过去3天内的新闻，确保您看到的是最新动态。</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <i className="fas fa-table text-green-500 text-2xl mb-4"></i>
                <h3 className="font-bold text-lg mb-2">清爽表格</h3>
                <p className="text-gray-500">结构化展示标题、时间和来源，一眼扫过核心信息。</p>
              </div>
              <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
                <i className="fas fa-brain text-purple-500 text-2xl mb-4"></i>
                <h3 className="font-bold text-lg mb-2">AI 自动总结</h3>
                <p className="text-gray-500">搜索完成后立即调用 Gemini 引擎，为您总结纷繁的信息。</p>
              </div>
            </div>
          </div>
        )}

        {view === 'results' && (
          <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <button 
                  onClick={goBack}
                  className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium mb-4 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i> 返回首页
                </button>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-bold text-gray-900">
                    搜索结果: <span className="text-blue-600">“{state.query}”</span>
                  </h2>
                  {!state.isLoading && state.results.length > 0 && (
                    <span className="text-lg font-medium text-gray-400">
                      共 {state.results.length} 条
                    </span>
                  )}
                </div>
              </div>
              
              {!state.isLoading && state.results.length > 0 && (
                <button
                  onClick={handleSummarize}
                  disabled={state.isSummarizing}
                  className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-70"
                >
                  {state.isSummarizing ? (
                    <><i className="fas fa-circle-notch fa-spin text-blue-500"></i> 处理中...</>
                  ) : (
                    <><i className="fas fa-sync-alt"></i> 重新生成总结</>
                  )}
                </button>
              )}
            </div>

            {state.error && (
              <div className="p-6 bg-red-50 border border-red-200 text-red-900 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <i className="fas fa-exclamation-triangle text-red-600 text-xl"></i>
                  <span className="font-bold text-lg">无法加载结果</span>
                </div>
                <p className="text-sm opacity-90">{state.error}</p>
                <div className="flex gap-4 mt-2">
                  <button 
                    onClick={() => handleSearch(state.query)}
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
              <div className={`p-8 rounded-2xl border transition-all duration-500 ${state.isSummarizing ? 'bg-gray-50 border-gray-100 animate-pulse' : 'bg-blue-50 border-blue-100 shadow-sm'}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`font-bold text-lg flex items-center gap-2 ${state.isSummarizing ? 'text-gray-400' : 'text-blue-900'}`}>
                    <i className={`fas fa-sparkles ${state.isSummarizing ? 'text-gray-300' : 'text-blue-500'}`}></i> 
                    {state.isSummarizing ? 'Gemini 正在为您深度分析...' : 'AI 洞察总结'}
                  </h3>
                  {state.isSummarizing && (
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </div>
                
                {state.summary ? (
                  <div className="text-blue-800 leading-relaxed whitespace-pre-line relative z-10 text-lg">
                    {state.summary}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-full"></div>
                    <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                    <div className="h-4 bg-gray-200 rounded w-4/6"></div>
                  </div>
                )}
              </div>
            )}

            {state.isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse flex items-center px-6">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              state.results.length > 0 && <NewsTable items={state.results} />
            )}
          </div>
        )}

        {view === 'debug' && (
          <DebugView onBack={goBack} />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-4">
          <p className="text-gray-400 text-sm">© 2024 Gemini News Navigator. AI 总结由 Google Gemini 3 提供支持。</p>
          <button 
            onClick={openDebug}
            className="text-gray-300 hover:text-blue-500 transition-colors text-xs flex items-center gap-1"
          >
            <i className="fas fa-bug"></i> 开发者诊断模式
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
