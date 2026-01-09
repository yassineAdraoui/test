
import React, { useState, useEffect } from 'react';
import { sendTelegramNotification } from './TelegramSettings';
import { Settings2, CheckCircle2, Edit3, Save } from 'lucide-react';

// --- Helper Functions for Email Processing ---

const parseKeyHeaders = (rawEmail: string): { headers: { [key: string]: string }; error?: string } => {
  const headers: { [key: string]: string } = {};
  const headerSection = rawEmail.split(/\r?\n\r?\n/)[0];
  
  if (!headerSection) {
      return { headers, error: 'Could not find email headers. Please paste the full raw email source.' };
  }

  const headerLines = headerSection.split(/\r?\n/);
  let lastHeader = '';
  const keyHeaders = ['From', 'To', 'Subject', 'Date', 'Message-ID', 'Reply-To', 'Received: from', 'Sender'];

  headerLines.forEach(line => {
    const match = line.match(/^([^:\s]+):\s*(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (keyHeaders.some(h => h.toLowerCase() === key.toLowerCase())) {
         headers[key] = value;
         lastHeader = key;
      } else {
         lastHeader = '';
      }
    } else if (line.match(/^\s+/) && lastHeader && headers[lastHeader]) {
       headers[lastHeader] += ' ' + line.trim();
    }
  });
  
  return { headers };
};

const cleanEmailSource = (rawEmail: string, fromOption: string, senderPrefix: string): string => {
  if (!rawEmail.trim()) {
    return '';
  }

  const separatorMatch = rawEmail.match(/\r?\n\r?\n/);
  let headerSection = rawEmail;
  let bodySection = "";

  if (separatorMatch && separatorMatch.index !== undefined) {
    headerSection = rawEmail.substring(0, separatorMatch.index);
    bodySection = rawEmail.substring(separatorMatch.index);
  }
  
  const whitelist = [
    'Received', 'Date', 'From', 'To', 'Message-ID', 'Subject', 
    'MIME-Version', 'Content-Type', 'Content-Transfer-Encoding', 
    'Reply-To', 'Feedback-ID', 'List-Unsubscribe'
  ];
  
  const headerLines = headerSection.split(/\r?\n/);
  const preservedHeaders: string[] = [];
  let currentHeaderToKeep = false;

  headerLines.forEach(line => {
    const match = line.match(/^([^:\s]+):\s*(.*)/);
    if (match) {
      const key = match[1];
      const isReceived = key.toLowerCase() === 'received';
      const isWhitelisted = whitelist.some(h => h.toLowerCase() === key.toLowerCase());
      
      if (isWhitelisted) {
        if (isReceived) {
          if (line.toLowerCase().includes('received: from')) {
            currentHeaderToKeep = true;
            preservedHeaders.push(line);
          } else {
            currentHeaderToKeep = false;
          }
        } else {
          currentHeaderToKeep = true;
          preservedHeaders.push(line);
        }
      } else {
        currentHeaderToKeep = false;
      }
    } else if (line.match(/^\s+/) && currentHeaderToKeep) {
      preservedHeaders.push(line);
    }
  });

  let cleanedHeaders = preservedHeaders.join('\r\n');

  // Remove existing placeholders if they were in the raw source to avoid double prefixes
  cleanedHeaders = cleanedHeaders.replace(/\[EID\]/g, '');
  cleanedHeaders = cleanedHeaders.replace(/\[RAND\]/g, '');
  
  // Apply To: logic
  cleanedHeaders = cleanedHeaders.replace(/^(To:).*$/im, 'To: [*to] \r CC: [*to]');
  
  // Apply Message-ID logic: Inject hardcoded '[EID]' before @ in Message-ID
  cleanedHeaders = cleanedHeaders.replace(/^(Message-ID:[\s\S]*?)@/im, `$1[EID]@`);

  // Apply Domain Injection logic (RDNS / P_RPATH) 
  // AND Inject the custom senderPrefix before @ in From/Sender parameters
  cleanedHeaders = cleanedHeaders.replace(/^((?:From|Sender):.*)@(.*)$/im, (match, p1, p2) => {
    const domainAndRest = p2;
    const innerSeparator = domainAndRest.match(/[>\s]/);
    const partBeforeAtWithPrefix = `${p1}${senderPrefix}`;

    if (innerSeparator && innerSeparator.index !== undefined) {
      const rest = domainAndRest.substring(innerSeparator.index);
      return `${partBeforeAtWithPrefix}@${fromOption}${rest}`;
    }
    return `${partBeforeAtWithPrefix}@${fromOption}`;
  });

  return cleanedHeaders.trim() + bodySection;
};

type UploadedFile = { name: string; content: string };
type CleanedFile = { name: string; cleanedContent: string };

const EmailCleaner: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [fromOption, setFromOption] = useState<'[RDNS]' | '[P_RPATH]'>('[P_RPATH]');
  const [senderPrefix, setSenderPrefix] = useState('[EID]');
  const [rawEmail, setRawEmail] = useState('');
  const [cleanedEmail, setCleanedEmail] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<{ [key: string]: string }>({});
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [cleanedFiles, setCleanedFiles] = useState<CleanedFile[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    handleClearAll();
  }, [mode]);

  const handleClean = async () => {
    if (mode === 'single' && !rawEmail.trim()) {
      setError('Email source cannot be empty.');
      return;
    }
    if (mode === 'bulk' && uploadedFiles.length === 0) {
      setError('Please upload at least one file.');
      return;
    }
    
    setError('');

    if (mode === 'single') {
        const { headers, error: parseError } = parseKeyHeaders(rawEmail);
        if(parseError) {
            setError(parseError);
            return;
        }
        setParsedHeaders(headers);
        const cleaned = cleanEmailSource(rawEmail, fromOption, senderPrefix);
        setCleanedEmail(cleaned);
        await sendTelegramNotification(`Email Cleaner Result (${fromOption})`, cleaned, 'cleaned_header.txt');
    } else {
        const results = uploadedFiles.map(file => ({
            name: file.name,
            cleanedContent: cleanEmailSource(file.content, fromOption, senderPrefix)
        }));
        setCleanedFiles(results);
        const notificationContent = results.map(r => `--- ${r.name} ---\n${r.cleanedContent}`).join('\n\n');
        await sendTelegramNotification(`Bulk Email Cleaner (${fromOption}) - ${results.length} files`, notificationContent, 'bulk_cleaned_headers.txt');
    }
    setShowResults(true);
  };

  const handleClearAll = () => {
    setRawEmail(''); setCleanedEmail(''); setParsedHeaders({}); setUploadedFiles([]);
    setCleanedFiles([]); setShowResults(false); setError(''); setCopySuccess(null); setFileCount(0);
  };

  const handleCopy = (textToCopy: string, identifier: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopySuccess(identifier);
        setTimeout(() => setCopySuccess(null), 2000);
      });
  };

  const handleDownload = (content: string, originalName: string) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const cleanedFileName = `cleaned-${originalName.replace(/\.[^/.]+$/, "")}.txt`;
      link.setAttribute('download', cleanedFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };
  
  const handleDownloadAll = () => {
    if (cleanedFiles.length === 0) return;

    const allContent = cleanedFiles
      .map(file => file.cleanedContent)
      .join('\n\n__SEP__\n\n');

    const blob = new Blob([allContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk-cleaned-headers.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        setFileCount(files.length);
        // FIX: Explicitly type the 'file' parameter as 'File' to resolve type inference issues,
        // which caused errors when accessing `file.name` or using `file` as a Blob.
        const fileReadPromises = Array.from(files).map((file: File) => {
            return new Promise<UploadedFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e: ProgressEvent<FileReader>) => resolve({ name: file.name, content: e.target?.result as string });
                reader.onerror = () => reject(new Error("Failed to read file: " + file.name));
                reader.readAsText(file);
            });
        });
        // FIX: Added type check for error in catch block to safely access 'message' property.
        Promise.all(fileReadPromises).then(setUploadedFiles).catch(err => {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred while reading files.');
            }
        });
    } else {
        setFileCount(0); setUploadedFiles([]);
    }
  };

  return (
    <div className="container mx-auto px-6 pb-12">
       <div className="max-w-4xl mx-auto">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button onClick={() => setMode('single')} className={`px-6 py-2 rounded-t-lg font-semibold ${mode === 'single' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Single Header</button>
            <button onClick={() => setMode('bulk')} className={`px-6 py-2 rounded-t-lg font-semibold ${mode === 'bulk' ? 'bg-white dark:bg-gray-800 text-blue-600 border-b-2 border-blue-600' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>Bulk Headers</button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-b-lg shadow-md border-x border-b border-gray-100 dark:border-gray-700">
        
        {/* Cleaning Options Section */}
        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-6 text-gray-700 dark:text-gray-300 font-bold text-sm uppercase tracking-wider">
            <Settings2 size={18} className="text-blue-500" />
            Cleaning Configuration
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Injection Options */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-tighter">Domain Mapping</label>
              <div className="flex gap-3">
                <button 
                  onClick={() => setFromOption('[P_RPATH]')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${fromOption === '[P_RPATH]' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fromOption === '[P_RPATH]' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {fromOption === '[P_RPATH]' && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="font-bold text-xs">[P_RPATH]</span>
                </button>

                <button 
                  onClick={() => setFromOption('[RDNS]')}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg border-2 transition-all ${fromOption === '[RDNS]' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 hover:border-blue-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${fromOption === '[RDNS]' ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                    {fromOption === '[RDNS]' && <CheckCircle2 size={12} className="text-white" />}
                  </div>
                  <span className="font-bold text-xs">[RDNS]</span>
                </button>
              </div>
            </div>

            {/* Prefix Option */}
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-tighter">Local-Part Prefix (Before @)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                  <Edit3 size={16} />
                </div>
                <input 
                  type="text" 
                  value={senderPrefix}
                  onChange={(e) => setSenderPrefix(e.target.value)}
                  placeholder="e.g. [EID] or [RAND]"
                  className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-lg text-sm font-mono focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all dark:text-gray-200"
                />
              </div>
              <p className="mt-2 text-[10px] text-gray-400 italic">This string will be appended to the user part of From/Sender emails.</p>
            </div>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">{mode === 'single' ? 'Paste Email Source' : 'Upload Bulk Email Sources'}</h2>
        {mode === 'single' ? (
          <textarea value={rawEmail} onChange={(e) => setRawEmail(e.target.value)} placeholder="Delivered-To: user@example.com..." className="w-full h-64 p-4 border dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        ) : (
          <div className="mt-4">
             <label htmlFor="file-upload" className="w-full flex flex-col items-center justify-center px-4 py-6 border border-blue-500 rounded-lg cursor-pointer hover:bg-blue-600 hover:text-white transition-colors">
                <span className="text-base">{fileCount > 0 ? `${fileCount} file(s) selected` : 'Select files (.txt, .eml)'}</span>
            </label>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.eml" multiple />
          </div>
        )}
        {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
        <div className="text-center mt-6 flex justify-center gap-4">
          <button onClick={handleClean} className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold hover:bg-blue-700 transition-all shadow-lg active:scale-95">Clean Header(s)</button>
          <button onClick={handleClearAll} className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-8 py-3 rounded-full font-semibold hover:bg-gray-200 transition-all shadow-lg active:scale-95">Clear All</button>
        </div>
      </div>
      {showResults && (
        <div className="max-w-4xl mx-auto mt-10 space-y-8 animate-fade-in">
          {mode === 'single' && (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200">Cleaned Email Source</h3>
                  <div className="flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">{fromOption}</span>
                    <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-3 py-1 rounded text-xs font-bold uppercase tracking-wider">Prefix: {senderPrefix}</span>
                  </div>
                </div>
                <textarea readOnly value={cleanedEmail} className="w-full h-80 p-4 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 dark:text-gray-200 rounded-md font-mono text-sm outline-none" />
                <div className="flex justify-end gap-2 mt-4">
                  <button onClick={() => handleDownload(cleanedEmail, 'cleaned-email.txt')} className="px-6 py-2 rounded-md font-semibold text-white bg-gray-600 hover:bg-gray-700 transition-colors">Download .txt</button>
                  <button onClick={() => handleCopy(cleanedEmail, 'single')} className={`px-6 py-2 rounded-md font-semibold text-white transition-all ${copySuccess === 'single' ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{copySuccess === 'single' ? 'Copied!' : 'Copy Content'}</button>
                </div>
            </div>
          )}
          
          {mode === 'bulk' && cleanedFiles.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-700 dark:text-gray-200">Bulk Results Summary</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">{cleanedFiles.length} files cleaned successfully.</p>
              </div>
              <button
                onClick={handleDownloadAll}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-green-700 transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <Save size={16} />
                Download All (.txt)
              </button>
            </div>
          )}

          {mode === 'bulk' && cleanedFiles.map((file, idx) => (
            <div key={idx} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 truncate pr-4">Source: <span className="text-blue-600">{file.name}</span></h3>
                <div className="flex items-center gap-2">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-3 py-1 rounded text-xs font-bold uppercase whitespace-nowrap">{fromOption}</span>
                  <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 px-3 py-1 rounded text-xs font-bold uppercase whitespace-nowrap">{senderPrefix}</span>
                </div>
              </div>
              <textarea readOnly value={file.cleanedContent} className="w-full h-60 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 dark:text-gray-200 rounded-md font-mono text-sm outline-none" />
              <div className="flex justify-end gap-2 mt-4">
                <button onClick={() => handleDownload(file.cleanedContent, file.name)} className="px-6 py-2 rounded-md text-white bg-gray-600 hover:bg-gray-700 transition-colors">Download .txt</button>
                <button onClick={() => handleCopy(file.cleanedContent, file.name)} className={`px-6 py-2 rounded-md text-white transition-all ${copySuccess === file.name ? 'bg-green-500' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{copySuccess === file.name ? 'Copied!' : 'Copy'}</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
};

export default EmailCleaner;
