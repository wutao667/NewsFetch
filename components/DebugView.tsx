
import React, { useState } from 'react';
import { fetchGoogleNews } from '../services/newsService';
import { generateNewsSummary } from '../services/geminiService';

interface ApiTestState {
  status: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  details?: string;
}

export const DebugView: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [newsTest, setNewsTest] = useState<ApiTestState>({ status: 'idle', message: '准备就绪' });
  const [geminiTest, setGeminiTest] = useState<ApiTestState>({ status: 'idle', message: '准备就绪' });

  const testNewsApi = async () => {
    setNewsTest({ status: 'loading', message: '正在请求后端代理 /api/news...' });
    try {
      const results = await fetchGoogleNews('Technology');
      setNewsTest({ 
        status: 'success', 
        message: `成功！获取到 ${results.length} 条新闻`,
        details: JSON.stringify(results.slice(0, 2), null, 2)
      });
    } catch (err: any) {
      setNewsTest({ status: 'error', message: '测试失败', details: err.message });
    }
  };

  const testGeminiApi = async () => {
    setGeminiTest({ status: 'loading', message: '正在请求后端代理 /api/gemini...' });
    try {
      // 模拟一个小的新闻列表进行测试
      const mockNews = [{ title: '调试模式测试新闻', link: '', pubDate: '', source: 'Debug' }];
      const summary = await generateNewsSummary(mockNews, 'Debug Test');
      setGeminiTest({ 
        status: 'success', 
        message: '成功！后端 Gemini 代理响应正常',
        details: summary 
      });
    } catch (err: any) {
      setGeminiTest({ status: 'error', message: '代理请求失败', details: err.message });
    }
  };

  const StatusBadge = ({ status }: { status: ApiTestState['status'] }) => {
    const colors = {
      idle: 'bg-gray-100 text-gray-600',
      loading: 'bg-blue-100 text-blue-600',
      success: 'bg-green-100 text-green-600',
      error: 'bg-red-100 text-red-600'
    };
    const labels = {
      idle: '未开始',
      loading: '进行中',
      success: '正常',
      error: '异常'
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${colors[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <i className="fas fa-tools text-blue-600"></i> 系统 API 诊断
        </h2>
        <button 
          onClick={onBack}
          className="text-gray-500 hover:text-gray-700 font-medium transition-colors"
        >
          关闭诊断
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Google News Test Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Google News RSS</h3>
              <p className="text-sm text-gray-500">测试 /api/news 代理</p>
            </div>
            <StatusBadge status={newsTest.status} />
          </div>
          <div className="bg-gray-50 p-4 rounded-xl mb-4 h-32 overflow-auto font-mono text-xs">
            <p className="font-bold mb-1">{newsTest.message}</p>
            {newsTest.details && <pre className="text-gray-400 whitespace-pre-wrap">{newsTest.details}</pre>}
          </div>
          <button
            onClick={testNewsApi}
            disabled={newsTest.status === 'loading'}
            className="w-full py-2 bg-gray-900 text-white rounded-lg hover:bg-black transition-colors disabled:opacity-50"
          >
            {newsTest.status === 'loading' ? <i className="fas fa-spinner fa-spin"></i> : '开始测试'}
          </button>
        </div>

        {/* Gemini API Test Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="font-bold text-lg text-gray-800">Gemini AI (Proxy)</h3>
              <p className="text-sm text-gray-500">测试 /api/gemini 代理</p>
            </div>
            <StatusBadge status={geminiTest.status} />
          </div>
          <div className="bg-gray-50 p-4 rounded-xl mb-4 h-32 overflow-auto font-mono text-xs">
            <p className="font-bold mb-1">{geminiTest.message}</p>
            {geminiTest.details && <pre className="text-gray-400 whitespace-pre-wrap">{geminiTest.details}</pre>}
          </div>
          <button
            onClick={testGeminiApi}
            disabled={geminiTest.status === 'loading'}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {geminiTest.status === 'loading' ? <i className="fas fa-spinner fa-spin"></i> : '开始测试'}
          </button>
        </div>
      </div>

      <div className="p-6 bg-yellow-50 border border-yellow-100 rounded-2xl">
        <h4 className="text-yellow-800 font-bold mb-2 flex items-center gap-2">
          <i className="fas fa-info-circle"></i> 诊断提示
        </h4>
        <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
          <li><strong>安全说明：</strong>所有 API 请求现已通过 Vercel 后端中转，前端不再直接持有任何密钥。</li>
          <li>如果 <strong>Gemini</strong> 失败，请检查 Vercel 项目设置中的 <code>API_KEY</code> 环境变量是否已添加并生效。</li>
          <li>Edge Functions 可能有超时限制，复杂话题总结建议重试。</li>
        </ul>
      </div>
    </div>
  );
};
