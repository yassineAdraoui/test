
import React, { useState, useRef, useEffect } from 'react';
import { Link, Play, Trash2, Copy, Settings, Save } from 'lucide-react';
import { sendTelegramNotification } from './TelegramSettings';

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
      addLog('[ERROR] No valid URLs found.');
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
                const data = await response.json();
                return data.contents;
            }
        },
        {
            name: 'CORS-Proxy.io',
            buildUrl: (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
            parse: async (response: Response) => await response.text()
        }
    ];

    for (const url of urls) {
      let success = false;
      for (const proxy of proxies) {
        try {
          addLog(`[FETCH] Trying ${proxy.name} for ${url}...`);
          const response = await fetch(proxy.buildUrl(url));
          if (!response.ok) throw new Error('Proxy failed');
          const htmlContent = await proxy.parse(response);

          const parser = new DOMParser();
          const doc = parser.parseFromString(htmlContent, 'text/html');
          
          const elementsToRemove = [
            'script', 'style', 'nav', 'footer', 'header', 'aside', 'form', 'iframe', 'noscript',
            '[id*="cookie"]', '[class*="cookie"]', '[id*="ad"]', '[class*="ad"]'
          ].join(', ');
          doc.querySelectorAll(elementsToRemove).forEach(el => el.remove());

          const mainContent = 
            doc.querySelector('main') || doc.querySelector('article') || doc.querySelector('.content') || doc.body;
          
          let rawText = mainContent.textContent || '';
          let text = rawText.replace(/(\r\n|\r)/gm, "\n").replace(/[ \t]+/g, ' ');

          const cleanedLines = text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0);
          
          text = cleanedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();

          allContent.push(text);
          addLog(`[SUCCESS] Extracted from ${url}.`);
          success = true;
          break;
        } catch (e: any) {
          addLog(`[WARN] ${proxy.name} failed: ${e.message}`);
        }
      }
      if (!success) addLog(`[ERROR] All proxies failed for ${url}.`);
    }

    const finalResult = allContent.join(`\n\n${separator}\n\n`);
    setExtractedText(finalResult);

    if (finalResult) {
      await sendTelegramNotification(`Text Extractor: ${urls.length} URLs processed`, finalResult, 'extracted_scraped_text.txt');
    }

    addLog('[COMPLETE] Extraction finished.');
    setIsLoading(false);
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
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-7xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Text Extractor from Links</h2>
        <p className="text-gray-500 dark:text-gray-400">Scrape and combine text from multiple URLs.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 space-y-6">
          <textarea value={urlsInput} onChange={(e) => setUrlsInput(e.target.value)} className="w-full h-48 p-3 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border dark:border-gray-600 rounded-lg text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
          <input type="text" value={separator} onChange={(e) => setSeparator(e.target.value)} className="w-full px-4 py-2 dark:bg-gray-900 dark:text-gray-200 border dark:border-gray-600 rounded-lg text-sm" placeholder="Separator" />
          <div className="flex gap-4">
            <button onClick={handleExtract} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2">
              {isLoading ? 'Extracting...' : 'Extract Text'}
            </button>
            <button onClick={() => setUrlsInput('')} className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg"><Trash2 size={16}/></button>
          </div>
        </div>
        <div className="flex flex-col gap-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 flex flex-col flex-1">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold dark:text-white">Extracted Content</h3>
              <div className="flex gap-2">
                <button onClick={handleDownload} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"><Save size={14}/></button>
                <button onClick={handleCopy} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"><Copy size={14}/></button>
              </div>
            </div>
            <textarea readOnly value={extractedText} className="w-full flex-1 p-3 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border dark:border-gray-700 rounded-lg text-sm outline-none" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TextExtractor;
