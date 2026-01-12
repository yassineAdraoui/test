import React, { useState, useRef, useEffect } from 'react';
import { Search, UploadCloud, FileText, Target as TargetIcon, Terminal, Trash2, Copy, Save, Settings, Loader2, Key } from 'lucide-react';
import { sendTelegramNotification } from './TelegramSettings';
import { GoogleGenAI } from "@google/genai";

// This is a browser-only global provided by the execution environment.
// FIX: Inlined the AIStudio type definition within `declare global` to resolve conflicting declarations for `window.aistudio`.
declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center gap-4 border dark:border-gray-700">
    <div className="p-2 rounded-md" style={{ backgroundColor: color }}>{icon}</div>
    <div>
      <p className="text-xs text-gray-500 uppercase font-semibold">{label}</p>
      <p className="text-xl font-bold dark:text-gray-100">{value}</p>
    </div>
  </div>
);

const DataCollector: React.FC = () => {
    const [hasApiKey, setHasApiKey] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [inputText, setInputText] = useState('');
    const [consoleLogs, setConsoleLogs] = useState<string[]>(['[CONSOLE] Ready.']);
    const [isExtracting, setIsExtracting] = useState(false);
    const [fileCount, setFileCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [separatorInterval, setSeparatorInterval] = useState(25);
    const [separatorString, setSeparatorString] = useState('__SEP__');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const checkApiKey = async () => {
            if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
                setHasApiKey(true);
                addLog('[SYSTEM] API Key found.');
            } else {
                addLog('[SYSTEM] API Key not found. Please select a key to use the search feature.');
            }
        };
        checkApiKey();
    }, []);
    
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLogs]);
    
    useEffect(() => {
        const words = inputText.trim().split(/\s+/).filter(Boolean);
        setWordCount(words.length);
    }, [inputText]);

    const addLog = (message: string) => setConsoleLogs(prev => [...prev, message]);
    
    const handleSelectKey = async () => {
        if (window.aistudio) {
            await window.aistudio.openSelectKey();
            // Assume success to avoid race conditions and unlock the UI immediately.
            setHasApiKey(true);
            addLog('[SYSTEM] API Key selected. You can now use the search feature.');
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;
        
        setIsSearching(true);
        addLog(`[SEARCH] Querying Google for PDF links related to: "${searchQuery}"`);
        
        try {
            // Instantiate the client right before the call to ensure the latest key is used.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Search for and list only direct .pdf file links related to the keyword: "${searchQuery}". 
            Try to find results that would typically appear on Google, Bing, and Yandex. 
            Return only the URLs, one per line. Do not include descriptions.`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    tools: [{ googleSearch: {} }]
                }
            });

            const text = response.text || "";
            const urls = text.match(/https?:\/\/[^\s"<>)]+\.pdf/gi) || [];
            
            const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
            if (chunks.length > 0) {
                addLog(`[SOURCES] Found ${chunks.length} search references.`);
                chunks.forEach((chunk: any, i: number) => {
                    if (chunk.web?.uri) addLog(`[REF ${i+1}] ${chunk.web.uri}`);
                });
            }

            if (urls.length > 0) {
                const uniqueUrls = Array.from(new Set(urls));
                const newText = uniqueUrls.join('\n');
                setInputText(prev => prev + (prev ? '\n' : '') + newText);
                addLog(`[SUCCESS] Extracted ${uniqueUrls.length} unique PDF links.`);
                
                await sendTelegramNotification(
                    `Data Collector: PDF Links found for "${searchQuery}"`, 
                    `Keyword: ${searchQuery}\n\nFound Links:\n${newText}`, 
                    'pdf_search_results.txt'
                );
            } else {
                addLog("[INFO] No direct PDF links found in current search window.");
            }
        } catch (err: any) {
            console.error(err);
            const errorMessage = err.message || 'Unknown error';
            addLog(`[ERROR] Search failed: ${errorMessage}`);
            if (errorMessage.includes('API Key not valid') || errorMessage.includes('Requested entity was not found')) {
                addLog('[SYSTEM] API Key validation failed. Please select a valid key from a paid project.');
                setHasApiKey(false); // Reset to force key selection again
            }
        } finally {
            setIsSearching(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        const readPromises = Array.from(files).map((file: File) => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result as string);
                reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
                reader.readAsText(file);
            });
        });
        Promise.all(readPromises).then(contents => {
            setInputText(prev => prev + (prev ? '\n' : '') + contents.join('\n'));
            setFileCount(prev => prev + files.length);
            addLog(`[LOAD] Added ${files.length} files to workspace.`);
        }).catch(err => {
            if (err instanceof Error) addLog(`[ERROR] ${err.message}`);
        });
    };
    
    const handleSeparateText = () => {
        if (!inputText) return;
        const lines = inputText.split('\n');
        const newLines = [];
        for (let i = 0; i < lines.length; i++) {
            newLines.push(lines[i]);
            if ((i + 1) % separatorInterval === 0 && i < lines.length - 1) newLines.push(separatorString);
        }
        setInputText(newLines.join('\n'));
        addLog(`[SUCCESS] Separators inserted every ${separatorInterval} lines.`);
    };

    const handleExtraction = async () => {
        setIsExtracting(true);
        addLog("[INIT] Processing data for Telegram...");
        const urlRegex = /https?:\/\/[^\s"<>]+/g;
        const urls = inputText.match(urlRegex);
        
        let notificationContent = '';
        if (urls) {
            const uniqueUrls = Array.from(new Set(urls));
            notificationContent = `Extracted Unique URLs (${uniqueUrls.length}):\n${uniqueUrls.join('\n')}\n\nFull Workspace Data:\n${inputText}`;
            addLog(`[SUCCESS] Found ${uniqueUrls.length} unique URLs.`);
        } else {
            notificationContent = `Workspace Analysis Result:\nWord count: ${wordCount}\n\nContent:\n${inputText}`;
            addLog("[DONE] Text analyzed and sent.");
        }
    
        const success = await sendTelegramNotification('Data Collector Export', notificationContent, 'workspace_data.txt');
        if (success) addLog("[TELEGRAM] Data transmitted successfully.");
        else addLog("[TELEGRAM] Transmission failed.");
        
        setIsExtracting(false);
    };

    if (!hasApiKey) {
        return (
            <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-2xl animate-fade-in text-center">
                <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
                    <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Key size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">API Key Required</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        The advanced search feature uses a powerful model that requires a Google AI Studio API key. Please select a key from a paid Google Cloud project to proceed.
                    </p>
                    <button
                        onClick={handleSelectKey}
                        className="w-full font-bold py-3 px-6 rounded-xl transition-all shadow-lg bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200/50"
                    >
                        Select API Key
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">
                        For more information on billing, visit{' '}
                        <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                            ai.google.dev/gemini-api/docs/billing
                        </a>.
                    </p>
                </div>
            </div>
        );
    }

    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl animate-fade-in">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
                    <TargetIcon className="text-blue-500" /> Data Collector Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Find and organize global PDF links and text data</p>
            </header>

            <div className="bg-gray-50 dark:bg-gray-900 p-4 mb-8 flex flex-col sm:flex-row items-center gap-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Keyword for PDF search (e.g. 'Cybersecurity 2024')" 
                        value={searchQuery} 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                        className="w-full bg-white dark:bg-gray-800 pl-12 pr-4 py-3 rounded-lg dark:text-white outline-none border border-transparent focus:border-blue-500 transition-all" 
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                </div>
                <button 
                    onClick={handleSearch} 
                    disabled={isSearching || !searchQuery.trim()}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md active:scale-95"
                >
                    {isSearching ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                    {isSearching ? "SEARCHING..." : "SEARCH PDFS"}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div className="relative group">
                        <div className="absolute top-3 right-3 flex gap-2">
                             <button onClick={() => setInputText('')} className="p-2 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-red-500 hover:text-white rounded transition-colors text-gray-500 dark:text-gray-400">
                                <Trash2 size={16} />
                             </button>
                        </div>
                        <textarea 
                            value={inputText} 
                            onChange={(e) => setInputText(e.target.value)} 
                            className="w-full h-80 bg-gray-50 dark:bg-gray-900 dark:text-white p-4 rounded-xl outline-none border border-gray-200 dark:border-gray-700 font-mono text-sm leading-relaxed focus:ring-2 focus:ring-blue-500 transition-all" 
                            placeholder="Search results and uploads appear here..." 
                        />
                    </div>
                    
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-10 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group">
                        <UploadCloud className="mx-auto text-gray-400 group-hover:text-blue-500 mb-2 transition-colors" size={32} />
                        <p className="dark:text-white font-medium">Upload bulk text files</p>
                        <p className="text-xs text-gray-400 mt-1">Append raw data to current workspace</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                    </div>
                </div>

                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-4">
                       <StatCard icon={<FileText size={20} className="text-white"/>} label="LOADED FILES" value={fileCount} color="#3b82f6" />
                       <StatCard icon={<FileText size={20} className="text-white"/>} label="WORKSPACE WORDS" value={wordCount} color="#22c55e" />
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700/30 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-500 uppercase">
                            <Settings size={14} /> Organization Tools
                        </div>
                        <div className="flex gap-2 mb-3">
                            <div className="flex-1">
                                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Every X lines</label>
                                <input type="number" value={separatorInterval} onChange={(e) => setSeparatorInterval(Number(e.target.value))} className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex-[2]">
                                <label className="text-[10px] text-gray-400 uppercase font-bold mb-1 block">Separator String</label>
                                <input type="text" value={separatorString} onChange={(e) => setSeparatorString(e.target.value)} className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white outline-none focus:border-blue-500" />
                            </div>
                        </div>
                        <button onClick={handleSeparateText} className="w-full bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 py-3 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95">
                            Format Workspace
                        </button>
                    </div>

                    <button 
                        onClick={handleExtraction} 
                        disabled={isExtracting || !inputText.trim()} 
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isExtracting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                        {isExtracting ? "PROCESSING..." : "EXPORT TO TELEGRAM"}
                    </button>

                    <div className="flex flex-col flex-1 min-h-[200px] bg-gray-900 rounded-xl border border-gray-800 overflow-hidden shadow-2xl">
                        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2">
                             <Terminal size={14} className="text-blue-400" />
                             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Process Stream</span>
                        </div>
                        <div className="p-4 h-full overflow-y-auto font-mono text-[10px] text-blue-400/90 space-y-1">
                            {consoleLogs.map((log, i) => (
                                <div key={i} className="flex gap-2">
                                    <span className="opacity-30">[{i}]</span>
                                    <span className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[SUCCESS]') ? 'text-emerald-400' : ''}>{log}</span>
                                </div>
                            ))}
                            <div ref={consoleEndRef} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
};

export default DataCollector;
