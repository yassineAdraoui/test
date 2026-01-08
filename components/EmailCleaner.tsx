
import React, { useState, useEffect } from 'react';

// --- Helper Functions for Email Processing ---

/**
 * Extracts key headers from the raw email source.
 * @param rawEmail The full raw email source string.
 * @returns An object containing parsed headers and a potential error message.
 */
const parseKeyHeaders = (rawEmail: string): { headers: { [key: string]: string }; error?: string } => {
  const headers: { [key: string]: string } = {};
  const headerSection = rawEmail.split(/\r?\n\r?\n/)[0];
  
  if (!headerSection) {
      return { headers, error: 'Could not find email headers. Please paste the full raw email source.' };
  }

  const headerLines = headerSection.split(/\r?\n/);
  let lastHeader = '';
  const keyHeaders = ['From', 'To', 'Subject', 'Date', 'Message-ID', 'Return-Path', 'Reply-To', 'Received: from', 'Sender'];

  headerLines.forEach(line => {
    const match = line.match(/^([^:\s]+):\s*(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2].trim();
      if (keyHeaders.some(h => h.toLowerCase() === key.toLowerCase())) {
         headers[key] = value;
         lastHeader = key;
      } else {
         lastHeader = ''; // Reset if it's not a header we are interested in
      }
    } else if (line.match(/^\s+/) && lastHeader && headers[lastHeader]) {
       // This is a folded header line (starts with whitespace)
       headers[lastHeader] += ' ' + line.trim();
    }
  });
  
  return { headers };
};

/**
 * Cleans the raw email source by removing unnecessary headers and anonymizing data.
 * @param rawEmail The full raw email source string.
 * @returns A cleaned email source string.
 */
const cleanEmailSource = (rawEmail: string): string => {
  if (!rawEmail.trim()) {
    return '';
  }
  let cleaned = rawEmail;

  // Anonymize/replace placeholders
  cleaned = cleaned.replace(/\[EID\]/g, '');
  cleaned = cleaned.replace(/^(To:).*$/im, 'To: [*to] \r CC: [*to]');
  cleaned = cleaned.replace(/^(Message-ID:.*)@/im, '$1[EID]@');

  // Replace the domain in the 'From:' and 'Sender:' headers with [P_RPATH]
  cleaned = cleaned.replace(/^((?:From|Sender):.*@)(.*)$/im, (match, p1, p2) => {
    const domainAndRest = p2;
    // Find the first separator (space or '>') after the domain
    const separatorMatch = domainAndRest.match(/[>\s]/);
    if (separatorMatch && separatorMatch.index !== undefined) {
      // Reconstruct the line with the placeholder
      const rest = domainAndRest.substring(separatorMatch.index);
      return `${p1}[P_RPATH]${rest}`;
    }
    // If no separator, the rest of the line is the domain
    return `${p1}[P_RPATH]`;
  });


  // Headers to remove unconditionally
  const headersToRemove = [
    'Delivered-To',
    'Authentication-Results',
    'Received-SPF',
    'DKIM-Signature',
    'DomainKey-Signature',
    'ARC-Seal',
    'ARC-Message-Signature',
    'ARC-Authentication-Results',
    'Return-Path',
    'X-Google-Smtp-Source',
    'X-Received',
    'X-MSFBL',
    // 'Sender', // Removed from removal list to allow the domain replacement logic above to work
    'CC' // Also remove original CC if present
  ];
  const removalRegex = new RegExp(
    `^(${headersToRemove.join('|')}):.*(?:\\r?\\n[ \\t].*)*\\r?\\n?`,
    'gim'
  );
  cleaned = cleaned.replace(removalRegex, '');

  // Conditionally remove 'Received:' headers, keeping ones that trace the path
  const receivedRegex = /^Received:.*(?:\r?\n[ \\t].*)*/gim;
  cleaned = cleaned.replace(receivedRegex, (match) => {
    const firstLine = match.split(/\r?\n/)[0];
    if (firstLine.toLowerCase().startsWith('received: from')) {
      return match;
    }
    return '';
  });
  
  // Collapse any blank lines right before a 'Received: from' header.
  cleaned = cleaned.replace(/(\r?\n[ \t]*){2,}(?=Received: from)/gi, '\r\n');

  // Collapse multiple blank lines and trim whitespace
  return cleaned.trim().replace(/(\r?\n){3,}/g, '\r\n\r\n');
};


// --- EmailCleaner Component ---
const BULK_DELIMITER = '----------';

type UploadedFile = { name: string; content: string };
type CleanedFile = { name: string; cleanedContent: string };

const EmailCleaner: React.FC = () => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  
  // State for single mode
  const [rawEmail, setRawEmail] = useState('');
  const [cleanedEmail, setCleanedEmail] = useState('');
  const [parsedHeaders, setParsedHeaders] = useState<{ [key: string]: string }>({});

  // State for bulk mode
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [cleanedFiles, setCleanedFiles] = useState<CleanedFile[]>([]);
  
  // Common state
  const [showResults, setShowResults] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState<string | null>(null); // Use string to track which item is copied
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    // Reset state when switching modes
    setRawEmail('');
    setCleanedEmail('');
    setParsedHeaders({});
    setUploadedFiles([]);
    setCleanedFiles([]);
    setShowResults(false);
    setError('');
    setFileCount(0);
  }, [mode]);

  const handleClean = () => {
    if (mode === 'single' && !rawEmail.trim()) {
      setError('Email source cannot be empty. Please paste content.');
      setShowResults(false);
      return;
    }
    if (mode === 'bulk' && uploadedFiles.length === 0) {
      setError('Please upload at least one file.');
      setShowResults(false);
      return;
    }
    
    setError('');

    if (mode === 'single') {
        const { headers, error: parseError } = parseKeyHeaders(rawEmail);
        if(parseError) {
            setError(parseError);
            setShowResults(false);
            return;
        }
        setParsedHeaders(headers);
        setCleanedEmail(cleanEmailSource(rawEmail));
    } else { // bulk mode
        const results = uploadedFiles.map(file => ({
            name: file.name,
            cleanedContent: cleanEmailSource(file.content)
        }));
        setCleanedFiles(results);
    }
    setShowResults(true);
  };

  const handleCopy = (textToCopy: string, identifier: string) => {
    navigator.clipboard.writeText(textToCopy).then(() => {
        setCopySuccess(identifier);
        setTimeout(() => setCopySuccess(null), 2000); // Reset after 2 seconds
      }).catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };

  const handleDownload = (content: string, originalName: string) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // create a cleaned filename from the original
      const cleanedFileName = `cleaned-${originalName.replace(/\.[^/.]+$/, "")}.txt`;
      link.setAttribute('download', cleanedFileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
        setFileCount(files.length);
        
        const fileReadPromises = Array.from(files).map(file => {
            return new Promise<UploadedFile>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve({
                    name: file.name,
                    content: e.target?.result as string
                });
                reader.onerror = (e) => reject(new Error("Failed to read file: " + file.name));
                reader.readAsText(file);
            });
        });

        Promise.all(fileReadPromises)
            .then(setUploadedFiles)
            .catch(error => {
                // FIX: Handle error of type 'unknown' safely.
                if (error instanceof Error) {
                    setError(error.message);
                } else {
                    setError('An unknown error occurred while reading files.');
                }
                console.error(error);
            });

    } else {
        setFileCount(0);
        setUploadedFiles([]);
    }
  };

  const ModeButton: React.FC<{ currentMode: 'single' | 'bulk'; buttonMode: 'single' | 'bulk'; children: React.ReactNode }> = ({ currentMode, buttonMode, children }) => (
    <button
      onClick={() => setMode(buttonMode)}
      className={`px-6 py-2 rounded-t-lg font-semibold transition-all focus:outline-none ${
        currentMode === buttonMode
          ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="container mx-auto px-6 pb-12 transition-colors duration-300">
       <div className="max-w-4xl mx-auto">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
            <ModeButton currentMode={mode} buttonMode="single">Single Header</ModeButton>
            <ModeButton currentMode={mode} buttonMode="bulk">Bulk Headers</ModeButton>
        </div>
      </div>
      <div className="max-w-4xl mx-auto bg-white dark:bg-gray-800 p-8 rounded-b-lg shadow-md transition-colors duration-300">
        <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-2">
            {mode === 'single' ? 'Paste Email Source' : 'Upload Bulk Email Sources'}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            {mode === 'single' 
                ? 'Paste the full raw email source below to clean and analyze its headers.' 
                : `Upload one or more files containing email sources. Each file will be treated as a separate email.`
            }
        </p>

        {mode === 'single' ? (
          <textarea
            value={rawEmail}
            onChange={(e) => setRawEmail(e.target.value)}
            placeholder={'Delivered-To: user@example.com...'}
            className="w-full h-64 p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition outline-none"
            aria-label="Raw email source input"
          />
        ) : (
          <div className="mt-4">
             <label htmlFor="file-upload" className="w-full flex flex-col sm:flex-row items-center justify-center px-4 py-6 bg-white dark:bg-gray-900 text-blue-500 dark:text-blue-400 rounded-lg shadow-sm tracking-wide uppercase border border-blue-500 dark:border-blue-400 cursor-pointer hover:bg-blue-600 dark:hover:bg-blue-600 hover:text-white dark:hover:text-white transition-colors duration-200">
                <svg className="w-8 h-8 mb-2 sm:mb-0 sm:mr-2" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3V7h2v4z" />
                </svg>
                <span className="mt-1 text-base leading-normal truncate">{fileCount > 0 ? `${fileCount} file(s) selected` : 'Select files (.txt, .eml)'}</span>
            </label>
            <input id="file-upload" type="file" className="hidden" onChange={handleFileChange} accept=".txt,.eml" multiple />
          </div>
        )}

        {error && <p className="text-red-500 dark:text-red-400 mt-2 text-sm">{error}</p>}

        <div className="text-center mt-6">
          <button
            onClick={handleClean}
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-all duration-300 hover:scale-105 shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Clean Header(s)
          </button>
        </div>
      </div>

      {showResults && (
        <div className="max-w-4xl mx-auto mt-10 space-y-8">
          {mode === 'single' && (
            <>
              {Object.keys(parsedHeaders).length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md transition-colors duration-300">
                  <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">Parsed Headers</h3>
                  <div className="space-y-3">
                      {Object.entries(parsedHeaders).map(([key, value]) => (
                        <div key={key} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                          <strong className="text-gray-600 dark:text-gray-400">{key}:</strong>
                          <span className="text-gray-800 dark:text-gray-200 ml-2 break-all">{value}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
              
              <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md transition-colors duration-300">
                <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-200 mb-4">Cleaned Email Source</h3>
                <textarea
                  readOnly
                  value={cleanedEmail}
                  className="w-full h-80 p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md font-mono text-sm outline-none"
                  aria-label="Cleaned email source output"
                />
                <div className="flex justify-end items-center mt-4 space-x-2">
                   <button
                    onClick={() => handleDownload(cleanedEmail, 'cleaned-email.txt')}
                    disabled={!cleanedEmail}
                    className="px-6 py-2 rounded-md font-semibold text-white bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Download .txt
                  </button>
                  <button
                    onClick={() => handleCopy(cleanedEmail, 'single')}
                    disabled={!cleanedEmail}
                    className={`px-6 py-2 rounded-md font-semibold text-white transition-colors duration-200 ${
                      copySuccess === 'single'
                        ? 'bg-green-500 hover:bg-green-600'
                        : 'bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500'
                    } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {copySuccess === 'single' ? 'Copied!' : 'Copy to Clipboard'}
                  </button>
                </div>
              </div>
            </>
          )}

          {mode === 'bulk' && cleanedFiles.map((file, index) => (
            <div key={index} className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md transition-colors duration-300">
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-4">
                Cleaned Source for: <span className="font-mono text-blue-600 dark:text-blue-400">{file.name}</span>
              </h3>
              <textarea
                readOnly
                value={file.cleanedContent}
                className="w-full h-60 p-4 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-md font-mono text-sm outline-none"
                aria-label={`Cleaned email source output for ${file.name}`}
              />
              <div className="flex justify-end items-center mt-4 space-x-2">
                 <button
                  onClick={() => handleDownload(file.cleanedContent, file.name)}
                  disabled={!file.cleanedContent}
                  className="px-6 py-2 rounded-md font-semibold text-white bg-gray-600 dark:bg-gray-600 hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Download .txt
                </button>
                <button
                  onClick={() => handleCopy(file.cleanedContent, file.name)}
                  disabled={!file.cleanedContent}
                  className={`px-6 py-2 rounded-md font-semibold text-white transition-colors duration-200 ${
                    copySuccess === file.name
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-indigo-600 dark:bg-indigo-600 hover:bg-indigo-700 dark:hover:bg-indigo-500'
                  } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {copySuccess === file.name ? 'Copied!' : 'Copy to Clipboard'}
                </button>
              </div>
            </div>
          ))}

        </div>
      )}
    </div>
  );
};

export default EmailCleaner;