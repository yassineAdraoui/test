
import React, { useState, useRef, useEffect } from 'react';
import { Search, UploadCloud, FileText, Target, Type, Terminal, Trash2, Copy, Save } from 'lucide-react';

// --- Sub-components for better structure ---

const StatCard: React.FC<{ icon: React.ReactNode; label: string; value: number | string; color: string }> = ({ icon, label, value, color }) => (
  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg flex items-center gap-4 border border-gray-200 dark:border-gray-700">
    <div className={`p-2 rounded-md`} style={{ backgroundColor: color }}>
      {icon}
    </div>
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-xl font-bold text-gray-800 dark:text-gray-100 tracking-tighter">{value}</p>
    </div>
  </div>
);

// --- Main Dashboard Component ---

const DataCollector: React.FC = () => {
    // Input and Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [isPdfOnly, setIsPdfOnly] = useState(true);
    const [inputText, setInputText] = useState('');

    // Console and Extraction State
    const [consoleLogs, setConsoleLogs] = useState<string[]>(['[CONSOLE] Prêt à fonctionner.']);
    const [isExtracting, setIsExtracting] = useState(false);
    
    // Stats State
    const [fileCount, setFileCount] = useState(0);
    const [targetCount, setTargetCount] = useState(0);
    const [wordCount, setWordCount] = useState(0);

    // Refs for file input and console scrolling
    const fileInputRef = useRef<HTMLInputElement>(null);
    const consoleEndRef = useRef<HTMLDivElement>(null);
    
    // Utility State
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

    // Effect for auto-scrolling the console
    useEffect(() => {
        consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [consoleLogs]);

    const addLog = (message: string) => {
        setConsoleLogs(prev => [...prev, message]);
    };
    
    const handleSearch = () => {
        if (!searchQuery) return;
        addLog(`[RECHERCHE] Lancement de la recherche pour "${searchQuery}"...`);
        addLog(`[FILTRE] .PDF uniquement: ${isPdfOnly ? 'Activé' : 'Désactivé'}`);
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                setInputText(prev => prev ? `${prev}\n\n---\n\n${content}` : content);
                setFileCount(prev => prev + 1);
                addLog(`[UPLOAD] Fichier "${file.name}" chargé avec succès.`);
            };
            reader.readAsText(file);
        }
    };

    const handleExtraction = async () => {
        setIsExtracting(true);
        addLog("[INITIALISATION] Démarrage du processus d'extraction...");
        
        const words = inputText.trim().split(/\s+/).filter(Boolean);
        setWordCount(words.length);

        await new Promise(res => setTimeout(res, 800));
        addLog("[ANALYSE] Analyse du texte source en cours...");

        await new Promise(res => setTimeout(res, 1200));
        addLog(`[CALCUL] ${words.length} mots détectés.`);
        setTargetCount(Math.floor(words.length / 10)); // Simulate finding targets
        
        await new Promise(res => setTimeout(res, 1000));
        addLog(`[SUCCÈS] ${Math.floor(words.length / 10)} cibles potentielles trouvées.`);
        
        await new Promise(res => setTimeout(res, 500));
        addLog("[TERMINÉ] Processus d'extraction achevé.");
        setIsExtracting(false);
    };
    
    const handleClean = () => {
        setInputText('');
        setConsoleLogs(['[CONSOLE] Prêt à fonctionner.']);
        setFileCount(0);
        setTargetCount(0);
        setWordCount(0);
        setSearchQuery('');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(consoleLogs.join('\n')).then(() => {
            setCopyStatus('copied');
            addLog('[SYSTEM] Console logs copied to clipboard.');
            setTimeout(() => setCopyStatus('idle'), 2000);
        });
    };

    const handleSave = () => {
        const content = consoleLogs.join('\n');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'results.txt';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        addLog('[EXPORT] Fichier "results.txt" sauvegardé.');
    };

    return (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        <style>{`
            .custom-scrollbar::-webkit-scrollbar { width: 8px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e5e7eb; border-radius: 4px; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #4b5563; }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #d1d5db; }
            .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: #6b7280; }
        `}</style>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 md:p-8">
            {/* Header */}
            <header className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Tableau de Bord</h1>
                <p className="text-md text-gray-500 dark:text-gray-400 mt-1">Module d'extraction de données et d'analyse de fichiers</p>
            </header>

            {/* Search Bar */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-lg p-3 mb-8 flex flex-col sm:flex-row items-center gap-4">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher des documents ou des mots-clés..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent pl-10 pr-4 py-2 text-gray-800 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <label className="flex items-center cursor-pointer select-none">
                        <input type="checkbox" checked={isPdfOnly} onChange={(e) => setIsPdfOnly(e.target.checked)} className="sr-only peer" />
                        <div className="w-4 h-4 rounded-sm flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all">
                           <svg className="w-2.5 h-2.5 text-white opacity-0 peer-checked:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <span className="ml-2 text-xs font-semibold tracking-wider text-gray-600 dark:text-gray-300">CHERCHER .PDF UNIQUEMENT</span>
                    </label>
                    <button 
                        onClick={handleSearch}
                        className="bg-blue-600 hover:bg-blue-700 transition-all text-white font-bold text-xs px-6 py-2.5 rounded-md flex items-center gap-2 shadow-sm"
                    >
                        <Search size={14} />
                        RECHERCHER
                    </button>
                </div>
            </div>

            {/* Main Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                
                {/* Input Column (Left) */}
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <div>
                        <label className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-2 block">Données d'entrée</label>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Collez vos données ici ou utilisez le téléchargeur..."
                            className="w-full h-64 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4 text-gray-800 dark:text-gray-200 placeholder:text-gray-500 outline-none focus:ring-2 focus:ring-blue-500 custom-scrollbar"
                        />
                    </div>
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 dark:hover:bg-blue-500/10 transition-all"
                    >
                        <UploadCloud className="w-10 h-10 text-gray-400 dark:text-gray-500 mb-3" />
                        <p className="font-bold text-gray-700 dark:text-gray-200">Téléchargement Unifié</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Glissez-déposez ou cliquez pour ajouter des fichiers</p>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".txt,.pdf,.doc,.docx" />
                    </div>
                </div>

                {/* Control Column (Right) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-3">
                       <StatCard icon={<FileText size={20} className="text-white"/>} label="FICHIERS" value={fileCount} color="#3b82f6" />
                       <StatCard icon={<Target size={20} className="text-white"/>} label="CIBLES" value={targetCount} color="#ef4444" />
                       <StatCard icon={<Type size={20} className="text-white"/>} label="MOTS" value={wordCount} color="#22c55e" />
                    </div>
                    <button 
                        onClick={handleExtraction}
                        disabled={isExtracting || !inputText}
                        className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-lg shadow-md hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isExtracting ? "EXTRACTION EN COURS..." : "INITIALISER L'EXTRACTION"}
                    </button>
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg flex flex-col flex-1 min-h-[280px] overflow-hidden">
                        <div className="flex items-center gap-2 p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                            <Terminal size={16} className="text-gray-500 dark:text-gray-400" />
                            <h3 className="font-bold text-sm text-gray-700 dark:text-gray-200">Console</h3>
                        </div>
                        <div className="bg-gray-900 dark:bg-black p-3 overflow-y-auto flex-1 custom-scrollbar text-xs font-mono">
                            {consoleLogs.map((log, index) => (
                                <p key={index} className={`whitespace-pre-wrap ${log.includes('[SUCCÈS]') || log.includes('[TERMINÉ]') ? 'text-green-400' : log.includes('[EXPORT]') || log.includes('[SYSTEM]') ? 'text-blue-400' : 'text-gray-400'}`}>
                                    {log}
                                </p>
                            ))}
                            <div ref={consoleEndRef} />
                        </div>
                        <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 grid grid-cols-3 gap-2">
                            <button onClick={handleClean} className="bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-500 text-xs font-bold p-2 rounded flex items-center justify-center gap-1.5 transition-all"><Trash2 size={12}/> Nettoyer</button>
                            <button onClick={handleCopy} className="bg-gray-500/10 hover:bg-gray-500/20 text-gray-600 dark:text-gray-300 text-xs font-bold p-2 rounded flex items-center justify-center gap-1.5 transition-all"><Copy size={12}/> {copyStatus === 'idle' ? 'Copier' : 'Copié!'}</button>
                            <button onClick={handleSave} className="bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-500 text-xs font-bold p-2 rounded flex items-center justify-center gap-1.5 transition-all"><Save size={12}/> Sauver.txt</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    );
};

export default DataCollector;
