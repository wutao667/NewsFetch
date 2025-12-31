
import React, { useState, useEffect, useCallback } from 'react';
import { SearchBox } from './components/SearchBox';
import { NewsTable } from './components/NewsTable';
import { DebugView } from './components/DebugView';
import { SearchState, View, TimeRange } from './types';
import { fetchGoogleNews } from './services/newsService';
import { generateNewsSummary } from './services/geminiService';

/**
 * 极简美化版格式化组件：支持渲染 [n] 引用标签，并支持点击跳转
 */
const FormattedSummary: React.FC<{ text: string }> = ({ text }) => {
  const lines = text.split('\n');

  return (
    <div className="space-y-7 text-gray-700 leading-relaxed text-base sm:text-lg font-normal">
      {lines.map((line, i) => {
        let trimmedLine = line.trim();
        
        // 1. 处理空行
        if (!trimmedLine) return <div key={i} className="h-1"></div>;

        // 2. 处理水平分隔线 (---)
        if (trimmedLine === '---' || trimmedLine === '***' || trimmedLine === '___') {
          return <hr key={i} className="my-10 border-none h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />;
        }

        // 3. 处理核心标题
        const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.*)/) || trimmedLine.match(/^(\d+\.)\s+(.*)/);
        if (headingMatch) {
          let content = headingMatch[2];
          content = content.replace(/\*\*/g, '');
          
          return (
            <div key={i} className="pt-6 pb-2">
              <div className="flex items-baseline gap-3 mb-3">
                <span className="text-blue-600 font-black text-xl italic opacity-50 select-none">
                  {headingMatch[1].includes('#') ? '§' : headingMatch[1]}
                </span>
                <h3 className="font-extrabold text-gray-900 text-xl sm:text-2xl tracking-tight">
                  {renderTextWithCitations(content)}
                </h3>
              </div>
            </div>
          );
        }

        // 4. 处理无序列表
        const listMatch = trimmedLine.match(/^[\-\*\+]\s+(.*)/);
        if (listMatch) {
          return (
            <div key={i} className="flex gap-3 pl-2 sm:pl-5 group">
              <span className="text-blue-400 mt-2 text-xs transition-transform group-hover:scale-150">◆</span>
              <span className="flex-1">{renderTextWithCitations(listMatch[1])}</span>
            </div>
          );
        }

        // 5. 处理普通段落
        return (
          <p key={i} className="relative pl-1">
            {renderTextWithCitations(line)}
          </p>
        );
      })}
    </div>
  );
};

/**
 * 辅助函数：渲染包含引用 [n] 和加粗的文本，将 [n] 转换为超链接
 */
const renderTextWithCitations = (text: string) => {
  const boldParts = text.split(/(\*\*.*?\*\*)/g);
  
  return boldParts.map((part, j) => {
    let content = part;
    let isBold = false;
    
    if (part.startsWith('**') && part.endsWith('**')) {
      content = part.slice(2, -2);
      isBold = true;
    }

    // 正则捕获：[1] 或 [1, 2]
    const citationParts = content.split(/(\[\d+(?:,\s*\d+)*\])/g);
    
    const rendered = citationParts.map((subPart, k) => {
      const citeMatch = subPart.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
      if (citeMatch) {
        // 如果有多个编号，如 [1, 2]，我们需要拆开分别做链接
        const numbers = citeMatch[1].split(',').map(n => n.trim());
        
        return (
          <span key={k} className="inline-flex items-center gap-0.5 align-top mt-1 mx-0.5">
            {numbers.map((num, idx) => (
              <a 
                key={idx}
                href={`#news-${num}`}
                className="inline-flex items-center justify-center px-1.5 py-0 bg-blue-100 text-blue-700 text-[10px] sm:text-[12px] font-black rounded-sm hover:bg-blue-600 hover:text-white transition-all cursor-pointer shadow-sm hover:scale-110 active:scale-95 no-underline"
                title={`跳转至原文编号: ${num}`}
              >
                {num}
              </a>
            ))}
          </span>
        );
      }
      return subPart;
    });

    if (isBold) {
      return (
        <strong key={j} className="font-bold text-gray-900 bg-blue-50/50 px-1 rounded">
          {rendered}
        </strong>
      );
    }
    return <span key={j}>{rendered}</span>;
  });
};

const App: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [history, setHistory] = useState<string[]>([]);
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
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 py-3 sm:py-4 sticky top-0 z-20 shadow-sm">
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

      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {view === 'home' && (
          <div className="max-w-4xl mx-auto text-center mt-6 sm:mt-20">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-4 sm:mb-6 leading-tight tracking-tight">
              洞察全球，<br />
              掌握<span className="text-blue-600">即时动态</span>的热点。
            </h2>
            <p className="text-gray-500 text-base sm:text-xl mb-8 sm:mb-12 max-w-2xl mx-auto font-medium">
              聚合全球实时新闻，通过 Gemini AI 进行深度研判与逻辑溯源，生成带有精准引用的分析报告。
            </p>
            
            <SearchBox 
              onSearch={handleSearch} 
              onTimeRangeChange={setActiveTimeRange}
              initialTimeRange={activeTimeRange}
              isLoading={state.isLoading} 
            />

            {history.length > 0 && (
              <div className="mt-8 animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center justify-center gap-4 mb-3">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">最近搜索</span>
                  <button 
                    onClick={clearHistory}
                    className="text-xs text-gray-300 hover:text-red-400 transition-colors"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {history.map((q, idx) => (
                    <div
                      key={idx}
                      className="group flex items-center bg-white border border-gray-100 rounded-full shadow-sm hover:border-blue-200 transition-all hover:shadow-md"
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
                          if (window.confirm(`确定要删除 "${q}" 吗？`)) {
                            deleteFromHistory(q);
                          }
                        }}
                        className="pr-2.5 pl-1 py-1 sm:py-1.5 text-gray-300 hover:text-red-500 transition-colors"
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
            <div className="lg:hidden w-full mb-4">
              <SearchBox 
                onSearch={handleSearch} 
                onTimeRangeChange={setActiveTimeRange}
                isLoading={state.isLoading} 
                initialValue={state.query} 
                initialTimeRange={activeTimeRange}
              />
            </div>

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
                      <><i className="fas fa-circle-notch fa-spin text-blue-500"></i> 分析中</>
                    ) : (
                      <><i className="fas fa-sync-alt"></i> 重新研判</>
                    )}
                  </button>
                )}
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                <h2 className="text-xl sm:text-3xl font-bold text-gray-900 break-words tracking-tight">
                  搜索结果: <span className="text-blue-600">“{state.query}”</span>
                </h2>
                {!state.isLoading && state.results.length > 0 && (
                  <span className="text-sm sm:text-lg font-medium text-gray-400">
                    聚合了 {state.results.length} 篇报道 (过去 {getTimeRangeLabel(state.timeRange)})
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
                <button 
                  onClick={() => handleSearch(state.query, state.timeRange)}
                  className="w-fit px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  重试搜索
                </button>
              </div>
            )}

            {(state.isSummarizing || state.summary) && (
              <div className={`relative p-5 sm:p-10 rounded-3xl border transition-all duration-700 overflow-hidden ${state.isSummarizing ? 'bg-white border-gray-100 shadow-sm animate-pulse' : 'bg-white border-blue-50 shadow-2xl shadow-blue-900/5'}`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${state.isSummarizing ? 'bg-gray-200' : 'bg-blue-600'}`}></div>
                
                <div className="flex items-center justify-between mb-8 sm:mb-12 relative z-10">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`p-2 sm:p-3 rounded-xl ${state.isSummarizing ? 'bg-gray-100' : 'bg-blue-600 shadow-lg shadow-blue-200'}`}>
                      <i className={`fas fa-wand-magic-sparkles text-sm sm:text-lg ${state.isSummarizing ? 'text-gray-400' : 'text-white'}`}></i> 
                    </div>
                    <div>
                      <h3 className={`font-black text-lg sm:text-2xl tracking-tighter ${state.isSummarizing ? 'text-gray-400' : 'text-gray-900'}`}>
                        {state.isSummarizing ? '正在进行深度研判...' : '深度分析报告'}
                      </h3>
                      {!state.isSummarizing && <p className="text-xs text-blue-500 font-bold uppercase tracking-widest mt-1">Strategic Intelligence Report</p>}
                    </div>
                  </div>
                  {state.isSummarizing && (
                    <div className="flex gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></div>
                    </div>
                  )}
                </div>
                
                {state.summary ? (
                  <div className="relative z-10 antialiased">
                    <FormattedSummary text={state.summary} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="h-5 bg-gray-50 rounded-full w-full"></div>
                    <div className="h-5 bg-gray-50 rounded-full w-[94%]"></div>
                    <div className="h-5 bg-gray-50 rounded-full w-[97%]"></div>
                    <div className="h-5 bg-gray-50 rounded-full w-[88%]"></div>
                  </div>
                )}
                
                {!state.isSummarizing && (
                  <div className="mt-12 pt-8 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-[10px] sm:text-xs text-gray-400 font-medium">
                    <div className="flex items-center gap-3">
                       <span className="bg-blue-50 text-blue-500 px-2 py-1 rounded">情报级分析</span>
                       <span className="italic">点击报告中的引用编号可对照下方资讯列表</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>引擎: Gemini 3 Flash-Preview</span>
                      <i className="fas fa-check-circle text-green-500"></i>
                    </div>
                  </div>
                )}
              </div>
            )}

            {state.isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-20 bg-white border border-gray-50 rounded-2xl animate-pulse flex items-center px-8 shadow-sm">
                    <div className="h-4 bg-gray-50 rounded-full w-3/4"></div>
                  </div>
                ))}
              </div>
            ) : (
              state.results.length > 0 && (
                <div className="space-y-6 pt-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                      <i className="fas fa-book-open text-blue-500"></i> 
                      参考资讯来源
                    </h3>
                    <span className="text-xs text-gray-400 font-medium">编号对应上方分析报告中的引用标签</span>
                  </div>
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

      <footer className="bg-white border-t border-gray-50 py-8 sm:py-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col items-center gap-6 text-center">
          <div className="flex items-center gap-4 opacity-30 grayscale">
            <i className="fab fa-google text-2xl"></i>
            <i className="fas fa-brain text-2xl"></i>
            <i className="fas fa-rss text-2xl"></i>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm font-medium tracking-wide">
            © 2024 Gemini News Navigator. <br className="sm:hidden" />
            基于 Google News RSS 与 Google GenAI 深度驱动
          </p>
          <button 
            onClick={openDebug}
            className="text-gray-300 hover:text-blue-500 transition-colors text-xs flex items-center gap-2 bg-gray-50 hover:bg-blue-50 px-4 py-2 rounded-full font-bold"
          >
            <i className="fas fa-bug"></i> 开发者诊断模式
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
