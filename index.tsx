
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');

// 全局错误捕获，用于调试白屏
const displayError = (message: string, stack?: string) => {
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; color: #721c24; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px; font-family: sans-serif;">
        <h2 style="margin-top: 0;">程序启动失败 (Runtime Error)</h2>
        <p><strong>错误信息:</strong> ${message}</p>
        ${stack ? `<pre style="font-size: 12px; overflow: auto; background: rgba(0,0,0,0.05); padding: 10px;">${stack}</pre>` : ''}
        <p style="font-size: 14px; color: #666;">请检查 Vercel 环境变量设置或浏览器控制台日志。</p>
      </div>
    `;
  }
};

window.onerror = (msg, url, line, col, error) => {
  displayError(msg.toString(), error?.stack);
  return false;
};

window.onunhandledrejection = (event) => {
  displayError(`未处理的异步错误: ${event.reason}`, event.reason?.stack);
};

try {
  if (!rootElement) {
    throw new Error("找不到 id 为 'root' 的挂载节点。");
  }

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} catch (err: any) {
  displayError(err.message, err.stack);
}
