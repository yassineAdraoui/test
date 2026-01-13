import React, { useState, useRef } from 'react';
import { FileUp, Combine, Settings, Download, Copy, Trash2, CheckCircle } from 'lucide-react';

type UploadedFile = {
  name: string;
  content: string;
};

const FileSeparator: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [separator, setSeparator] = useState('__SEP__');
  const [combinedContent, setCombinedContent] = useState('');
  const [error, setError] = useState('');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      setUploadedFiles([]);
      return;
    }
    
    setError('');
    const fileReadPromises = Array.from(files).map((file: File) => {
      return new Promise<UploadedFile>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => resolve({ name: file.name, content: e.target?.result as string });
        reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
        reader.readAsText(file);
      });
    });

    Promise.all(fileReadPromises)
      .then(setUploadedFiles)
      .catch(err => {
        if (err instanceof Error) setError(err.message);
        else setError('An unknown error occurred while reading files.');
      });
  };

  const handleCombine = () => {
    if (uploadedFiles.length === 0) {
      setError('Please upload at least one file to combine.');
      return;
    }
    const content = uploadedFiles.map(file => file.content).join(`\n${separator}\n`);
    setCombinedContent(content);
    setError('');
  };

  const handleClear = () => {
    setUploadedFiles([]);
    setCombinedContent('');
    setError('');
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const handleCopy = () => {
    if (!combinedContent) return;
    navigator.clipboard.writeText(combinedContent).then(() => {
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    });
  };

  const handleDownload = () => {
    if (!combinedContent) return;
    const blob = new Blob([combinedContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'combined-files.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-7xl animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-2">File Separator</h2>
        <p className="text-gray-500 dark:text-gray-400">Combine multiple text files into one with a custom separator.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 md:p-8 border border-gray-100 dark:border-gray-700">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Column */}
          <div className="flex flex-col gap-6">
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <FileUp className="mx-auto text-gray-400 group-hover:text-blue-500 mb-3 transition-colors" size={40} />
              <p className="dark:text-white font-bold text-lg">
                {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) loaded` : 'Click to select files'}
              </p>
              <p className="text-xs text-gray-400 mt-1">or drag and drop files here</p>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple accept=".txt,.eml,.csv,.md,.html,.xml,.json" />
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-4 text-xs font-bold text-gray-500 uppercase">
                <Settings size={14} className="text-blue-500" /> Configuration
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 block">Separator String</label>
                <input 
                  type="text" 
                  value={separator} 
                  onChange={(e) => setSeparator(e.target.value)} 
                  className="w-full p-2 text-sm rounded-lg border dark:bg-gray-800 dark:border-gray-600 dark:text-white outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}

            <div className="flex items-center gap-4">
              <button 
                onClick={handleCombine}
                disabled={uploadedFiles.length === 0}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Combine size={18} />
                Combine Files
              </button>
              <button
                onClick={handleClear}
                className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors shadow-sm"
                title="Clear Workspace"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>

          {/* Output Column */}
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-700 dark:text-gray-200">Combined Output</h3>
                <div className="flex gap-2">
                    <button 
                        onClick={handleDownload} 
                        disabled={!combinedContent}
                        className="px-3 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-all disabled:opacity-30 shadow-sm flex items-center gap-2 text-xs font-bold"
                    >
                        <Download size={14}/> Download
                    </button>
                    <button 
                        onClick={handleCopy} 
                        disabled={!combinedContent}
                        className={`px-3 py-1 border rounded-lg transition-all disabled:opacity-30 shadow-sm flex items-center gap-2 text-xs font-bold ${copyStatus === 'copied' ? 'bg-green-50 border-green-200 text-green-600' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-500'}`}
                    >
                        {copyStatus === 'copied' ? <CheckCircle size={14}/> : <Copy size={14}/>}
                        {copyStatus === 'copied' ? 'Copied!' : 'Copy'}
                    </button>
                </div>
            </div>
            <textarea 
              readOnly 
              value={combinedContent} 
              placeholder="Combined file content will appear here after processing..."
              className="w-full flex-1 h-[400px] p-4 bg-gray-50 dark:bg-gray-900 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg text-xs leading-relaxed outline-none font-mono shadow-inner"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileSeparator;
