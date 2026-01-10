
import React, { useState, useRef, useEffect } from 'react';
import { Link, Play, Trash2, Copy, Settings, Save, FileText, FileSearch, Terminal, Download, Square, Globe } from 'lucide-react';
import { sendTelegramNotification } from './TelegramSettings';

type ProxyOption = 'auto' | 'cors-proxy' | 'allorigins' | 'direct';

const TextExtractor: React.FC = () => {
  const [urlsInput, setUrlsInput] = useState('https://developer.mozilla.org/en-US/docs/Web/HTML\nhttps://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf');
  const [separator, setSeparator] = useState(' __SEP__ ');
  const [selectedProxy, setSelectedProxy] = useState<ProxyOption>('auto');
  const [extractedText, setExtractedText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusLogs, setStatusLogs] = useState<string[]>(['[STATUS] Ready to extract.']);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const abortControllerRef = useRef<AbortController | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [statusLogs]);

  const addLog = (message: string) => {
    setStatusLogs(prev => [...prev, message]);
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
    if (!pdfjsLib) throw new Error('PDF.js library not loaded in window context');

    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      const items = textContent.items as any[];
      let lastY = -1;
      let pageText = '';

      const sortedItems = items.sort((a, b) => {
        if (Math.abs(a.transform[5] - b.transform[5]) < 2) {
          return a.transform[4] - b.transform[4];
        }
        return b.transform[5] - a.transform[5];
      });

      for (const item of sortedItems) {
        const currentY = item.transform[5];
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        } else if (lastY !== -1) {
          pageText += ' ';
        }
        pageText += item.str;
        lastY = currentY;
      }

      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }

    return fullText.trim();
  };

  const handleExtract = async () => {
    const urls = urlsInput.split('\n').map(url => url.trim()).filter(url => url.startsWith('http'));

    if (urls.length === 0) {
      addLog('[ERROR] No valid URLs found.');
      return;
    }

    setIsLoading(true);
    setExtractedText('');
    setStatusLogs(['[INIT] Starting multi-format extraction...']);
    addLog(`[INFO] Found ${urls.length} target(s).`);
    addLog(`[CONFIG] Primary Proxy: ${selectedProxy.toUpperCase()}`);
    
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const allContent: string[] = [];

    const availableProxies = [
        {
            id: 'cors-proxy',
            name: 'CORS-Proxy.io',
            buildUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        },
        {
            id: 'allorigins',
            name: 'AllOrigins',
            buildUrl: (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
        },
        {
            id: 'direct',
            name: 'Direct Fetch',
            buildUrl: (url: string) => url,
        }
    ];

    try {
      for (const url of urls) {
        if (signal.aborted) break;

        let success = false;
        const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf');
        
        // Re-order proxies based on selection
        let proxyList = [...availableProxies];
        if (selectedProxy !== 'auto') {
            const chosen = proxyList.find(p => p.id === selectedProxy);
            if (chosen) {
                proxyList = [chosen, ...proxyList.filter(p => p.id !== selectedProxy)];
            }
        }

        for (const proxy of proxyList) {
          try {
            addLog(`[FETCH] Trying ${proxy.name}: ${url.substring(0, 40)}...`);
            
            const response = await fetch(proxy.buildUrl(url), { signal });
            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);

            if (isPdf) {
              addLog(`[BINARY] Parsing PDF...`);
              let buffer: ArrayBuffer;
              
              if (proxy.id === 'allorigins') {
                  const data = await response.json();
                  const content = data.contents;
                  const base64Match = content.match(/base64,(.*)$/);
                  const b64Data = base64Match ? base64Match[1] : content;
                  const binaryString = atob(b64Data);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                      bytes[i] = binaryString.charCodeAt(i);
                  }
                  buffer = bytes.buffer;
              } else {
                  buffer = await response.arrayBuffer();
              }

              const pdfText = await extractTextFromPdf(buffer);
              allContent.push(`[SOURCE: ${url}]\n[FORMAT: PDF]\n\n${pdfText}`);
              addLog(`[SUCCESS] PDF parsed (${pdfText.length} chars).`);
            } else {
              addLog(`[SCRAPE] Parsing HTML...`);
              let html: string;
              if (proxy.id === 'allorigins') {
                  const data = await response.json();
                  html = data.contents;
              } else {
                  html = await response.text();
              }

              const parser = new DOMParser();
              const doc = parser.parseFromString(html, 'text/html');
              
              const junk = ['script', 'style', 'nav', 'footer', 'header', 'aside', 'iframe', 'noscript'];
              junk.forEach(tag => doc.querySelectorAll(tag).forEach(el => el.remove()));

              const main = doc.querySelector('main') || doc.querySelector('article') || doc.body;
              let text = main.innerText || main.textContent || '';
              
              text = text.replace(/[ \t]+/g, ' ').split('\n')
                  .map(line => line.trim())
                  .filter(line => line.length > 0)
                  .join('\n')
                  .replace(/\n{3,}/g, '\n\n');

              allContent.push(`[SOURCE: ${url}]\n[FORMAT: HTML]\n\n${text}`);
              addLog(`[SUCCESS] HTML scraped (${text.length} chars).`);
            }
            
            success = true;
            break; 
          } catch (e: any) {
            if (e.name === 'AbortError') {
              addLog('[ABORT] Cancelled.');
              throw e;
            }
            addLog(`[WARN] ${proxy.name} failed: ${e.message}`);
          }
        }
        if (!success) addLog(`[ERROR] All proxies failed for: ${url}`);
      }

      const finalResult = allContent.join(`\n\n${separator}\n\n`);
      setExtractedText(finalResult);

      if (finalResult) {
        await sendTelegramNotification(`Extraction Complete: ${urls.length} sources`, finalResult, 'extracted_content.txt');
      }

      addLog('[COMPLETE] Job finished.');
    } catch (e: any) {
      if (e.name !== 'AbortError') {
        addLog(`[FATAL] ${e.message}`);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
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
    link.setAttribute('download', 'extracted-data.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-7xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Advanced Text Extractor</h2>
        <p className="text-gray-500 dark:text-gray-400">Fetch, parse, and aggregate content from Websites and PDF documents.</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Control Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Link size={16} className="text-blue-500" /> Target URL Entry
            </label>
            <div className="flex items-center gap-2">
                 <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">HTML</span>
                 <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded font-bold uppercase">PDF</span>
            </div>
          </div>
          
          <textarea 
            value={urlsInput} 
            onChange={(e) => setUrlsInput(e.target.value)} 
            placeholder="Paste URLs (one per line)...&#10;e.g. https://example.com/file.pdf"
            className="w-full h-64 p-4 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" 
          />
          
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-3 block flex items-center gap-1.5">
                <Globe size={12} /> Proxy Server Preference
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'auto', label: 'Auto' },
                  { id: 'cors-proxy', label: 'CORS-Proxy' },
                  { id: 'allorigins', label: 'AllOrigins' },
                  { id: 'direct', label: 'Direct' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProxy(p.id as ProxyOption)}
                    className={`text-[11px] font-bold py-2 rounded-lg border-2 transition-all ${
                      selectedProxy === p.id 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase">Output Separator</label>
                <input 
                  type="text" 
                  value={separator} 
                  onChange={(e) => setSeparator(e.target.value)} 
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono" 
                  placeholder="e.g. ---" 
                />
              </div>
              <div className="flex items-end gap-2">
                {!isLoading ? (
                  <button 
                    onClick={handleExtract} 
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                  >
                    <Play size={16}/>
                    Run
                  </button>
                ) : (
                  <button 
                    onClick={handleStop} 
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md"
                  >
                    <Square size={16}/>
                    Stop
                  </button>
                )}
                <button 
                  onClick={() => setUrlsInput('')} 
                  className="bg-gray-100 dark:bg-gray-700 p-2.5 rounded-lg text-gray-500 hover:text-red-500 transition-colors shadow-sm"
                  title="Clear Input"
                >
                  <Trash2 size={20}/>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Output Panel */}
        <div className="flex flex-col gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col flex-1 border border-gray-100 dark:border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" /> Aggregated Content
              </h3>
              <div className="flex gap-2">
                <button 
                  onClick={handleDownload} 
                  disabled={!extractedText}
                  className="p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-all disabled:opacity-30 shadow-sm flex items-center gap-2 px-3"
                  title="Download All"
                >
                  <Download size={16}/>
                  <span className="text-xs font-bold">Download All</span>
                </button>
                <button 
                  onClick={handleCopy} 
                  disabled={!extractedText}
                  className={`p-2 border rounded-lg transition-all disabled:opacity-30 shadow-sm ${copyStatus === 'copied' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-500'}`}
                  title="Copy Results"
                >
                  <Copy size={16}/>
                </button>
              </div>
            </div>
            <textarea 
              readOnly 
              value={extractedText} 
              placeholder="Extracted content will populate here..."
              className="w-full h-[360px] p-4 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-xs leading-relaxed outline-none font-mono shadow-inner" 
            />
          </div>
          
          {/* Console Output */}
          <div className="bg-gray-900 rounded-xl p-4 h-48 overflow-hidden flex flex-col shadow-2xl border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Terminal size={14} className="text-gray-500" />
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Live Process Stream</span>
              </div>
              {isLoading && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping"></div>}
            </div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px] text-emerald-400/90 space-y-1 custom-scrollbar scroll-smooth">
                {statusLogs.map((log, i) => (
                    <div key={i} className={`flex gap-2 ${log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-blue-400' : log.includes('[WARN]') ? 'text-amber-400' : ''}`}>
                        <span className="opacity-30">[{i}]</span>
                        <span>{log}</span>
                    </div>
                ))}
                <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.1);
        }
      `}</style>
    </div>
  );
};

export default TextExtractor;
