
import React, { useState, useRef, useEffect } from 'react';
import { Link, Play, Trash2, Copy, Settings, Save } from 'lucide-react';

const TextExtractor: React.FC = () => {
  const [urlsInput, setUrlsInput] = useState('https://developer.mozilla.org/en-US/docs/Web/HTML\nhttps://www.w3.org/TR/PNG/');
  const [separator, setSeparator] = useState(' __SEP__ ');
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusLogs, setStatusLogs] = useState<string[]>(['[STATUS] Ready to extract.']);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  const addLog = (message: string) => {
    setStatusLogs(prev => [...prev, message]);
  };

  const handleExtract = async () => {
    const urls = urlsInput.split('\n').map(url => url.trim()).filter(url => url.startsWith('http'));

    if (urls.length === 0) {
      addLog('[ERROR] No valid URLs found. Make sure each URL starts with http:// or https://.');
      return;
    }

    setIsLoading(true);
    setExtractedText('');
    setStatusLogs(['[INIT] Starting extraction process...']);
    addLog(`[INFO] Found ${urls.length} valid URL(s).`);

    const allContent: string[] = [];

    const proxies = [
        {
            name: 'AllOrigins',
            buildUrl: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
            parse: async (response: Response) => {
                if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
                const data = await response.json();
                if (!data.contents) throw new Error('Could not retrieve page content from proxy response.');
                return data.contents;
            }
        },
        {
            name: 'CORS-Proxy.io',
            buildUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            parse: async (response: Response) => {
                if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
                return await response.text();
            }
        }
    ];

    for (const url of urls) {
      let success = false;
      for (const proxy of proxies) {
        try {
          addLog(`[FETCH] Trying ${proxy.name} for ${url}...`);
          const response = await fetch(proxy.buildUrl(url));
          const htmlContent = await proxy.parse(response);

          // Parse the HTML and extract text content from the body
          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          
          const elementsToRemove = 'script, style, nav, footer, header, aside, .ad, [role="navigation"], [role="banner"], [role="contentinfo"]';
          doc.querySelectorAll(elementsToRemove).forEach(el => el.remove());

          const mainContent = doc.querySelector('main') || doc.querySelector('article') || doc.body;
          let text = mainContent.textContent || '';
          
          text = text.replace(/(\r\n|\n|\r)/gm, "\n");
          text = text.replace(/\n\s*\n/g, '\n\n');
          text = text.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\n');

          allContent.push(text);
          addLog(`[SUCCESS] Extracted from ${url} using ${proxy.name}.`);
          success = true;
          break; // Move to the next URL on success
        } catch (e: any) {
          addLog(`[WARN] ${proxy.name} failed for ${url}: ${e.message}`);
        }
      }
      if (!success) {
          addLog(`[ERROR] All proxies failed for ${url}.`);
      }
    }

    addLog('[PROCESS] Combining all extracted content...');
    const finalResult = allContent.join(`\n\n${separator}\n\n`);
    setExtractedText(finalResult);

    addLog('[COMPLETE] Extraction finished.');
    setIsLoading(false);
  };

  const handleClear = () => {
    setUrlsInput('');
    setExtractedText('');
    setStatusLogs(['[STATUS] Cleared. Ready for new extraction.']);
  };

  const handleCopy = () => {
    if (!extractedText) return;
    navigator.clipboard.writeText(extractedText).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleDownload = () => {
    if (!extractedText) return;
    const blob = new Blob([extractedText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'extracted-text.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-7xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Text Extractor from Links</h2>
        <p className="text-gray-500 dark:text-gray-400">Paste URLs to scrape their text content and combine them with a custom separator.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Input & Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 space-y-6">
          <div>
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-2">
              <Link size={16} /> URLs (one per line)
            </label>
            <textarea
              value={urlsInput}
              onChange={(e) => setUrlsInput(e.target.value)}
              placeholder="https://example.com/article1&#10;https://example.com/article2"
              className="w-full h-48 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">Note: Extraction quality may vary. Some sites may block scraping via proxy.</p>
          </div>
          <div>
            <label htmlFor="separator" className="text-sm font-bold text-gray-600 dark:text-gray-400 mb-2 block flex items-center gap-2">
              <Settings size={16} /> Content Separator
            </label>
            <input
              id="separator"
              type="text"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExtract}
              disabled={isLoading || !urlsInput}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-60"
            >
              {isLoading ? <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div> : <Play size={18}/>}
              {isLoading ? 'Extracting...' : 'Extract Text'}
            </button>
            <button
              onClick={handleClear}
              className="w-1/3 bg-gray-100 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-700 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        </div>

        {/* Right Column: Output & Status */}
        <div className="flex flex-col gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Extracted Content</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  disabled={!extractedText}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200"
                >
                  <Save size={12} /> Download .txt
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!extractedText}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50 ${copyStatus === 'copied' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'}`}
                >
                  <Copy size={12} /> {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <textarea
              readOnly
              value={extractedText}
              placeholder="Results will appear here..."
              className="w-full flex-1 p-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none resize-y"
            />
          </div>
          <div className="bg-gray-900 text-gray-300 rounded-xl shadow-lg p-4 font-mono text-xs h-40 overflow-y-auto border border-gray-700">
            {statusLogs.map((log, index) => (
              <p key={index} className={`whitespace-pre-wrap ${log.startsWith('[SUCCESS]') ? 'text-green-400' : log.startsWith('[WARN]') ? 'text-yellow-400' : log.startsWith('[ERROR]') ? 'text-red-400' : log.startsWith('[COMPLETE]') ? 'text-blue-400' : 'text-gray-400'}`}>
                {log}
              </p>
            ))}
            <div ref={consoleEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextExtractor;
