
import React, { useState, useRef, useEffect } from 'react';
import { Search, UploadCloud, FileText, Target, Type, Terminal, Trash2, Copy, Save, Settings } from 'lucide-react';
import { sendTelegramNotification } from './TelegramSettings';

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
    const [searchQuery, setSearchQuery] = useState('');
    const [isPdfOnly, setIsPdfOnly] = useState(true);
    const [inputText, setInputText] = useState('');
    const [consoleLogs, setConsoleLogs] = useState<string[]>(['[CONSOLE] Ready.']);
    const [isExtracting, setIsExtracting] = useState(false);
    const [fileCount, setFileCount] = useState(0);
    const [targetCount, setTargetCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);
    const [separatorInterval, setSeparatorInterval] = useState(25);
    const [separatorString, setSeparatorString] = useState('__SEP__');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLogs]);
    
    useEffect(() => {
        const words = inputText.trim().split(/\s+/).filter(Boolean);
        setWordCount(words.length);
    }, [inputText]);

    const addLog = (message: string) => setConsoleLogs(prev => [...prev, message]);
    
    const handleSearch = async () => {
        if (!searchQuery && !isPdfOnly) return;
        addLog(`[SEARCH] Query: "${searchQuery}"`);
        
        let notificationContent = '';
        if (isPdfOnly) {
            const lines = inputText.split('\n');
            const queryRegex = searchQuery ? new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
            const pdfResults = lines.filter(line => /\.pdf/i.test(line) && (queryRegex ? queryRegex.test(line) : true));

            if (pdfResults.length > 0) {
                const filteredText = pdfResults.join('\n');
                setInputText(filteredText);
                notificationContent = `PDF Search: Found ${pdfResults.length} matches.\n\n${filteredText}`;
                addLog(`[SUCCESS] Found ${pdfResults.length} matches.`);
            } else {
                notificationContent = `No PDF matches for "${searchQuery}".`;
                addLog("[INFO] No matches.");
            }
        } else {
             const matches = inputText.match(new RegExp(searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || [];
             notificationContent = `Search results for "${searchQuery}": Found ${matches.length} matches.`;
             addLog(`[INFO] Found ${matches.length} matches.`);
        }
        await sendTelegramNotification('Data Collector Search', notificationContent, 'search_results.txt');
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files) return;
        // FIX: Explicitly type the 'file' parameter as 'File' to resolve type inference issues,
        // which caused errors when accessing `file.name` or using `file` as a Blob.
        const readPromises = Array.from(files).map((file: File) => {
            return new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                // Fixed: Typed progress event to access result safely as string
                reader.onload = (e: ProgressEvent<FileReader>) => resolve(e.target?.result as string);
                reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
                reader.readAsText(file);
            });
        });
        // FIX: Added catch block to handle potential file reading errors.
        Promise.all(readPromises).then(contents => {
            setInputText(prev => prev + '\n' + contents.join('\n'));
            setFileCount(prev => prev + files.length);
        }).catch(err => {
            if (err instanceof Error) {
                addLog(`[ERROR] ${err.message}`);
            }
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
        addLog(`[SUCCESS] Separators inserted.`);
    };

    const handleExtraction = async () => {
        setIsExtracting(true);
        addLog("[INIT] Processing...");
        const urlRegex = /https?:\/\/[^\s"<>]+/g;
        const urls = inputText.match(urlRegex);
        
        let notificationContent = '';
        if (urls) {
            setTargetCount(urls.length); 
            const combined = `Extracted URLs:\n${urls.join('\n')}\n\nOriginal Text:\n${inputText}`;
            notificationContent = combined;
            addLog(`[SUCCESS] Found ${urls.length} URLs.`);
        } else {
            notificationContent = `Analysis complete. Word count: ${wordCount}`;
            addLog("[DONE] Text analyzed.");
        }
    
        await sendTelegramNotification('Data Collector Extraction', notificationContent, 'extraction_data.txt');
        setIsExtracting(false);
    };

    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8">
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold dark:text-white">Data Collector Dashboard</h1>
            </header>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 mb-8 flex flex-col sm:flex-row items-center gap-4 rounded-lg">
                <input type="text" placeholder="Search keywords..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-transparent px-4 py-2 dark:text-white outline-none" />
                <div className="flex items-center gap-4">
                    <button onClick={handleSearch} className="bg-blue-600 text-white px-6 py-2 rounded-md">SEARCH</button>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <textarea value={inputText} onChange={(e) => setInputText(e.target.value)} className="w-full h-64 bg-gray-50 dark:bg-gray-900 dark:text-white p-4 rounded-lg outline-none border dark:border-gray-700" placeholder="Paste data here..." />
                    <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500">
                        <UploadCloud className="mx-auto text-gray-400 mb-2" />
                        <p className="dark:text-white">Upload bulk files</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                    </div>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 gap-3">
                       <StatCard icon={<FileText size={20} className="text-white"/>} label="FILES" value={fileCount} color="#3b82f6" />
                       <StatCard icon={<Target size={20} className="text-white"/>} label="WORDS" value={wordCount} color="#22c55e" />
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <input type="number" value={separatorInterval} onChange={(e) => setSeparatorInterval(Number(e.target.value))} className="w-full mb-2 p-1 text-sm rounded dark:bg-gray-800 dark:text-white" placeholder="Interval" />
                        <button onClick={handleSeparateText} className="w-full bg-purple-600 text-white py-2 rounded text-sm">Separate Text</button>
                    </div>
                    <button onClick={handleExtraction} disabled={isExtracting} className="w-full bg-blue-600 text-white font-bold py-4 rounded-lg">
                        {isExtracting ? "PROCESSING..." : "SEND TO TELEGRAM"}
                    </button>
                    <div className="bg-gray-900 p-3 h-40 overflow-y-auto font-mono text-xs rounded-lg text-green-400">
                        {consoleLogs.map((log, i) => <p key={i}>{log}</p>)}
                        <div ref={consoleEndRef} />
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
};

export default DataCollector;
