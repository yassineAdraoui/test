
import React, { useState, useRef } from 'react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumberLeft?: number;
  lineNumberRight?: number;
}

const TextCompare: React.FC = () => {
  const [originalText, setOriginalText] = useState<string>("Paste your original text here...\nExample line 1\nExample line 2");
  const [changedText, setChangedText] = useState<string>("Paste your modified text here...\nExample line 1\nModified example line 2\nNew line 3");
  const [diffResult, setDiffResult] = useState<{ left: DiffLine[], right: DiffLine[] } | null>(null);

  // Search & Replace State
  const [searchTerm, setSearchTerm] = useState('');
  const [replaceTerm, setReplaceTerm] = useState('');
  const [targetSide, setTargetSide] = useState<'original' | 'changed'>('original');

  const fileInputLeft = useRef<HTMLInputElement>(null);
  const fileInputRight = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'original' | 'changed') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (target === 'original') setOriginalText(content);
        else setChangedText(content);
      };
      reader.readAsText(file);
    }
  };

  const compareDifferences = () => {
    const leftLines = originalText.split('\n');
    const rightLines = changedText.split('\n');
    
    const leftResult: DiffLine[] = [];
    const rightResult: DiffLine[] = [];

    const maxLines = Math.max(leftLines.length, rightLines.length);

    for (let i = 0; i < maxLines; i++) {
      const left = leftLines[i];
      const right = rightLines[i];

      if (left === right) {
        leftResult.push({ type: 'unchanged', content: left || '', lineNumberLeft: i + 1 });
        rightResult.push({ type: 'unchanged', content: right || '', lineNumberRight: i + 1 });
      } else {
        if (left !== undefined) {
          leftResult.push({ type: 'removed', content: left, lineNumberLeft: i + 1 });
        } else {
          leftResult.push({ type: 'unchanged', content: '', lineNumberLeft: undefined });
        }

        if (right !== undefined) {
          rightResult.push({ type: 'added', content: right, lineNumberRight: i + 1 });
        } else {
          rightResult.push({ type: 'unchanged', content: '', lineNumberRight: undefined });
        }
      }
    }

    setDiffResult({ left: leftResult, right: rightResult });
  };

  const clearAll = () => {
    setOriginalText('');
    setChangedText('');
    setDiffResult(null);
  };

  // --- Search & Replace Actions ---
  const handleFind = () => {
    if (!searchTerm) return;
    const text = targetSide === 'original' ? originalText : changedText;
    const count = (text.match(new RegExp(searchTerm, 'g')) || []).length;
    alert(`Found ${count} occurrences of "${searchTerm}" in the ${targetSide} text.`);
  };

  const handleReplace = () => {
    if (!searchTerm) return;
    const setter = targetSide === 'original' ? setOriginalText : setChangedText;
    const current = targetSide === 'original' ? originalText : changedText;
    setter(current.replace(searchTerm, replaceTerm));
  };

  const handleReplaceAll = () => {
    if (!searchTerm) return;
    const setter = targetSide === 'original' ? setOriginalText : setChangedText;
    const current = targetSide === 'original' ? originalText : changedText;
    // Simple global replace
    setter(current.split(searchTerm).join(replaceTerm));
  };

  const EditorPanel = ({ title, value, onChange, onUpload, placeholder, side }: { title: string, value: string, onChange: (v: string) => void, onUpload: () => void, placeholder: string, side: 'original' | 'changed' }) => (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex justify-between items-center mb-2 px-1">
        <span className="text-gray-600 dark:text-gray-400 font-bold text-sm uppercase tracking-wide">{title}</span>
        <button 
          onClick={onUpload}
          className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-3 py-1 rounded text-xs font-bold flex items-center gap-1 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          Import File
        </button>
      </div>
      <div className={`relative flex-1 bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden border ${targetSide === side ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200 dark:border-gray-700'} transition-all`}>
        <textarea
          value={value}
          onFocus={() => setTargetSide(side)}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck={false}
          className="w-full h-80 p-4 bg-transparent text-gray-800 dark:text-gray-200 font-sans text-sm leading-relaxed outline-none resize-none overflow-y-auto"
        />
      </div>
    </div>
  );

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-7xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">Text Compare</h2>
        <p className="text-gray-500 dark:text-gray-400">Compare two pieces of text side-by-side to find differences instantly.</p>
      </div>

      {/* Find & Replace Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 mb-6 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Find..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border-2 border-blue-400 dark:border-blue-500 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder="Replace with..."
            value={replaceTerm}
            onChange={(e) => setReplaceTerm(e.target.value)}
            className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
          />
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleFind}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95"
          >
            Find
          </button>
          <button 
            onClick={handleReplace}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95"
          >
            Replace
          </button>
          <button 
            onClick={handleReplaceAll}
            className="px-5 py-2 bg-[#8b5cf6] hover:bg-[#7c3aed] text-white text-sm font-bold rounded-lg shadow-sm transition-all active:scale-95"
          >
            Replace All
          </button>
        </div>
        <div className="w-full md:w-auto ml-auto flex items-center gap-2 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          <span>Targeting:</span>
          <select 
            value={targetSide}
            onChange={(e) => setTargetSide(e.target.value as 'original' | 'changed')}
            className="bg-transparent border-none outline-none text-blue-600 dark:text-blue-400 cursor-pointer"
          >
            <option value="original">Original Text</option>
            <option value="changed">Changed Text</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mb-8">
        <EditorPanel 
          title="Original Text" 
          value={originalText} 
          onChange={setOriginalText} 
          side="original"
          placeholder="Paste original text here..."
          onUpload={() => fileInputLeft.current?.click()} 
        />
        <input type="file" ref={fileInputLeft} className="hidden" onChange={(e) => handleFileUpload(e, 'original')} />
        
        <EditorPanel 
          title="Changed Text" 
          value={changedText} 
          onChange={setChangedText} 
          side="changed"
          placeholder="Paste modified text here..."
          onUpload={() => fileInputRight.current?.click()} 
        />
        <input type="file" ref={fileInputRight} className="hidden" onChange={(e) => handleFileUpload(e, 'changed')} />
      </div>

      <div className="flex flex-wrap justify-center gap-4 mb-12">
        <button 
          onClick={compareDifferences} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-base shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          Compare Text
        </button>
        <button 
          onClick={clearAll} 
          className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 px-8 py-3 rounded-xl font-bold text-base border border-gray-200 dark:border-gray-700 transition-all shadow-sm"
        >
          <svg className="w-5 h-5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Clear All
        </button>
      </div>

      {diffResult && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300">Comparison Result</h3>
            <div className="flex gap-4 text-xs font-bold">
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500 rounded"></span> Added
              </span>
              <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                <span className="w-3 h-3 bg-red-500/20 border border-red-500 rounded"></span> Removed
              </span>
            </div>
          </div>

          <div className="bg-[#1e1e1e] rounded-2xl shadow-2xl overflow-hidden border border-gray-300 dark:border-gray-800 flex flex-col md:flex-row min-h-[400px]">
            {/* Left Result (Original) */}
            <div className="flex-1 border-b md:border-b-0 md:border-r border-[#333] overflow-x-auto">
              <div className="flex flex-col min-w-[300px]">
                {diffResult.left.map((line, idx) => (
                  <div key={idx} className={`flex leading-6 font-mono text-sm ${line.type === 'removed' ? 'bg-red-900/40 text-red-200' : 'text-gray-400'}`}>
                    <div className="w-12 bg-[#252525] flex justify-center flex-shrink-0 text-gray-600 border-r border-[#333] text-xs pt-1 select-none">
                      {line.lineNumberLeft || ''}
                    </div>
                    <div className="px-4 py-0.5 whitespace-pre min-w-0">
                      {line.type === 'removed' ? '-' : ' '}{line.content || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Right Result (Changed) */}
            <div className="flex-1 overflow-x-auto">
              <div className="flex flex-col min-w-[300px]">
                {diffResult.right.map((line, idx) => (
                  <div key={idx} className={`flex leading-6 font-mono text-sm ${line.type === 'added' ? 'bg-emerald-900/40 text-emerald-200' : 'text-gray-400'}`}>
                    <div className="w-12 bg-[#252525] flex justify-center flex-shrink-0 text-gray-600 border-r border-[#333] text-xs pt-1 select-none">
                      {line.lineNumberRight || ''}
                    </div>
                    <div className="px-4 py-0.5 whitespace-pre min-w-0">
                      {line.type === 'added' ? '+' : ' '}{line.content || ' '}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TextCompare;
