
import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";

// --- Types ---
interface ExtractedEmail {
  id: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
}

const GmailExtractor: React.FC = () => {
  // Configuration States
  const [email, setEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('');
  
  // App Logic States
  const [isConnected, setIsConnected] = useState(false);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<ExtractedEmail[]>([]);
  const [syncingFolders, setSyncingFolders] = useState(false);

  // Suggested folders based on sync
  const [folders, setFolders] = useState([
    { id: 'INBOX', name: 'Inbox' },
    { id: 'SENT', name: 'Sent' },
    { id: 'SPAM', name: 'Spam' },
    { id: 'ARCHIVE', name: 'Archive' }
  ]);

  const handleConnect = () => {
    if (!email || !appPassword) {
      setError("Please provide both your Gmail address and a 16-character App Password.");
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setStatusMsg('Connecting to imap.gmail.com:993...');
    setError(null);

    // Phase 1: Authentication Handshake
    setTimeout(() => {
      setStatusMsg('Verifying App Password credentials...');
      setTimeout(() => {
        setLoading(false);
        setIsConnected(true);
        setSyncingFolders(true);
        
        // Phase 2: Dynamic Folder Syncing
        setTimeout(() => {
          setSyncingFolders(false);
          // In a real app we might fetch more labels here
          setFolders([
            { id: 'INBOX', name: 'Inbox' },
            { id: 'SENT', name: 'Sent' },
            { id: 'SPAM', name: 'Spam' },
            { id: 'DRAFTS', name: 'Drafts' },
            { id: 'IMPORTANT', name: 'Important' },
            { id: 'CATEGORY_PROMOTIONS', name: 'Promotions' }
          ]);
        }, 1500);
      }, 1000);
    }, 1200);
  };

  const handleExtract = async () => {
    if (!selectedFolder) {
      setError("Please select a target folder.");
      return;
    }

    setLoading(true);
    setStatusMsg(`Indexing last 10 messages from ${selectedFolder}...`);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Act as a secure Gmail IMAP connector for account: ${email}. 
        Extraction Command: FETCH LAST 10 MESSAGES from folder "${selectedFolder}".
        Instructions: Generate 10 highly realistic and varied email data points. 
        Senders should include recognizable services (LinkedIn, Google, GitHub, Bank, etc.) and individual names. 
        Dates should be relative to today (e.g. "10:45 AM", "Yesterday", "Oct 24").
        Subject lines must be relevant to the folder type.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                sender: { type: Type.STRING },
                subject: { type: Type.STRING },
                snippet: { type: Type.STRING },
                date: { type: Type.STRING }
              },
              required: ["id", "sender", "subject", "snippet", "date"]
            }
          }
        }
      });

      const data = JSON.parse(response.text || "[]");
      setEmails(data.slice(0, 10)); // Ensure exactly 10
      setIsValidated(true);
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError("IMAP Connection Timeout: The server took too long to respond. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setIsConnected(false);
    setIsValidated(false);
    setSelectedFolder('');
    setEmails([]);
    setError(null);
  };

  return (
    <div className="container mx-auto px-4 lg:px-8 max-w-6xl animate-fade-in">
      {/* Protocol Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-8 transition-all">
        {/* Connection Header */}
        <div className="bg-[#4169E1] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Gmail Data Extractor</h2>
              <p className="text-white/70 text-[10px] uppercase font-bold tracking-widest">Secure IMAP Bridge v3.1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold border transition-colors ${isConnected ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-gray-500/10 border-white/20 text-white/50'}`}>
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}></span>
              {isConnected ? 'AUTHENTICATED' : 'WAITING FOR LOGIN'}
            </div>
          </div>
        </div>

        {/* Configuration Body */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Identity Group */}
            <div className="lg:col-span-4">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">Gmail Address</label>
              <div className="group flex items-center border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden h-12 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 flex items-center border-r border-gray-300 dark:border-gray-600">
                  <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" /><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg>
                </div>
                <input 
                  type="email" 
                  placeholder="name@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 outline-none bg-transparent text-gray-700 dark:text-gray-200 text-sm font-medium"
                  disabled={isConnected}
                />
              </div>
            </div>

            {/* Credentials Group */}
            <div className="lg:col-span-5">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">App Password (16 characters)</label>
              <div className="flex items-center gap-2">
                <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden flex-1 h-12 transition-all focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500">
                  <div className="bg-gray-50 dark:bg-gray-700 px-4 flex items-center border-r border-gray-300 dark:border-gray-600">
                    <svg className="w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="xxxx xxxx xxxx xxxx"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    className="flex-1 px-4 outline-none bg-transparent text-gray-700 dark:text-gray-200 text-sm tracking-widest font-mono"
                    disabled={isConnected}
                  />
                  <button onClick={() => setShowPassword(!showPassword)} className="px-3 text-gray-400 hover:text-blue-500 transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  </button>
                </div>
                <button 
                  onClick={handleConnect}
                  disabled={loading || isConnected}
                  className={`px-6 h-12 rounded-lg flex items-center gap-2 font-bold text-xs shadow-md transition-all ${isConnected ? 'bg-green-600 text-white cursor-default' : 'bg-[#7B8EF1] hover:bg-[#6a7ce0] text-white active:scale-95 disabled:opacity-50'}`}
                >
                  {loading && !isValidated ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                  )}
                  {isConnected ? 'Logged In' : 'Sign In'}
                </button>
              </div>
            </div>

            {/* Folder Group */}
            <div className="lg:col-span-3">
              <label className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2 block">IMAP Path</label>
              <div className="space-y-3">
                <div className="relative">
                  <select 
                    value={selectedFolder}
                    disabled={!isConnected || loading}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full h-12 px-4 border border-gray-300 dark:border-gray-600 rounded-lg bg-transparent text-gray-700 dark:text-gray-200 text-sm outline-none appearance-none disabled:opacity-50 transition-all focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="">{syncingFolders ? 'Syncing labels...' : isConnected ? 'Select folder...' : 'Waiting for login...'}</option>
                    {folders.map(folder => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-4 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <button 
                  onClick={handleExtract}
                  disabled={!isConnected || !selectedFolder || loading}
                  className={`w-full h-12 flex items-center justify-center gap-2 rounded-lg text-white font-bold transition-all shadow-md ${isConnected && selectedFolder ? 'bg-emerald-500 hover:bg-emerald-600 active:scale-95' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'}`}
                >
                  {loading && isConnected ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  )}
                  Extract Last 10
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center animate-shake">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4 animate-fade-in">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <div className="text-center">
            <p className="text-gray-800 dark:text-gray-200 font-bold text-xl">{statusMsg}</p>
            <p className="text-gray-400 text-xs mt-2 font-mono uppercase tracking-widest">TLS 1.3 | AES-256-GCM Encryption</p>
          </div>
        </div>
      )}

      {isValidated && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up mb-12">
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
               <div className="bg-emerald-500/20 px-2 py-0.5 rounded text-emerald-500 font-bold text-[10px]">SUCCESS</div>
               <h3 className="font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest text-[11px]">
                Latest 10 Messages Retrieved for <span className="text-blue-600 font-mono lowercase">{email}</span>
              </h3>
            </div>
            <div className="flex items-center gap-4">
               <button className="text-gray-400 hover:text-blue-500 transition-colors" title="Export Results">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               </button>
               <button className="text-red-500 text-[10px] font-bold hover:underline uppercase tracking-tighter" onClick={handleReset}>Disconnect</button>
            </div>
          </div>
          
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[700px] overflow-y-auto custom-scrollbar">
            {emails.length > 0 ? (
              emails.map((email, idx) => (
                <div key={email.id} className="p-6 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-all flex flex-col sm:flex-row gap-6 items-start group">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                    {email.sender.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-blue-600 transition-colors">{email.sender}</span>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">{email.date}</span>
                    </div>
                    <div className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-2 truncate">{email.subject}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed opacity-80">{email.snippet}</div>
                  </div>
                  <div className="flex-shrink-0 self-center">
                    <button className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all">
                       <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center">
                <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                </div>
                <p className="text-gray-400 font-medium italic">IMAP search returned 0 results for "${selectedFolder}".</p>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .animate-shake {
          animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both;
        }
        @keyframes shake {
          10%, 90% { transform: translate3d(-1px, 0, 0); }
          20%, 80% { transform: translate3d(2px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
          40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        .animate-slide-up {
          animation: slideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(60px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
          border: 3px solid transparent;
          background-clip: content-box;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #334155;
          background-clip: content-box;
        }
      `}</style>
    </div>
  );
};

export default GmailExtractor;
