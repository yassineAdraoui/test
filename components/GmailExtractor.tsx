
import React, { useState, useRef } from 'react';

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
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<ExtractedEmail[]>([]);

  const handleConnect = () => {
    if (!email || !appPassword) {
      setError("Please provide both your Gmail address and an App Password.");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate connection process
    setTimeout(() => {
      setLoading(false);
      setIsConnected(true);
      setError(null);
    }, 1200);
  };

  const handleValidate = () => {
    if (!selectedFolder) {
      setError("Please select a folder to validate.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate validation and extraction process
    setTimeout(() => {
      const mockEmails: ExtractedEmail[] = [
        { id: '1', sender: 'support@google.com', subject: 'Security Alert', snippet: 'A new sign-in was detected on your account...', date: '10:45 AM' },
        { id: '2', sender: 'newsletter@tech.com', subject: 'Your Daily Digest', snippet: 'Check out the top stories in technology today...', date: '9:12 AM' },
        { id: '3', sender: 'hr@company.org', subject: 'Payroll Update', snippet: 'Please review the updated payroll schedule for Q4...', date: 'Yesterday' },
        { id: '4', sender: 'noreply@github.com', subject: '[GitHub] Successful login', snippet: 'Your account was accessed from a new IP...', date: 'Oct 24' },
      ];
      setEmails(mockEmails);
      setIsValidated(true);
      setLoading(false);
    }, 1500);
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
      {/* Configuration Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700 mb-8">
        {/* Blue Header Bar */}
        <div className="bg-[#4169E1] px-6 py-4 flex items-center gap-3">
          <div className="bg-white/20 p-1.5 rounded">
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
            </svg>
          </div>
          <h2 className="text-xl font-medium text-white">Gmail Email Configuration</h2>
        </div>

        {/* Configuration Body */}
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Gmail Email Section */}
            <div className="lg:col-span-4">
              <div className="flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                <label className="text-xs font-bold uppercase tracking-wider">Gmail Email</label>
              </div>
              <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden h-11 focus-within:ring-1 focus-within:ring-blue-500">
                <div className="bg-gray-50 dark:bg-gray-700 px-4 flex items-center border-r border-gray-300 dark:border-gray-600">
                  <span className="font-bold text-gray-500 dark:text-gray-400 text-lg">G</span>
                </div>
                <input 
                  type="email" 
                  placeholder="your.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 outline-none bg-transparent text-gray-700 dark:text-gray-200 text-sm"
                />
              </div>
            </div>

            {/* App Password Section */}
            <div className="lg:col-span-5">
              <div className="flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.9L10 9.503l7.834-4.603L10 3.033 2.166 4.9zM10 11.196L2 6.485V15a2 2 0 002 2h12a2 2 0 002-2V6.485l-8 4.711z" clipRule="evenodd" /></svg>
                <label className="text-xs font-bold uppercase tracking-wider">App Password</label>
                <div title="Create an App Password in your Google Account settings under Security." className="bg-teal-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] cursor-help">?</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex border border-gray-300 dark:border-gray-600 rounded overflow-hidden flex-1 h-11 focus-within:ring-1 focus-within:ring-blue-500">
                  <div className="bg-gray-50 dark:bg-gray-700 px-3.5 flex items-center border-r border-gray-300 dark:border-gray-600">
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" /></svg>
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="E"
                    value={appPassword}
                    onChange={(e) => setAppPassword(e.target.value)}
                    className="flex-1 px-4 outline-none bg-transparent text-gray-700 dark:text-gray-200 text-sm tracking-widest"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                  </button>
                </div>
                <button 
                  onClick={handleConnect}
                  disabled={loading || isConnected}
                  className={`px-5 h-11 rounded flex items-center gap-2 font-bold text-sm shadow-sm transition-all ${isConnected ? 'bg-green-500 cursor-default' : 'bg-[#7B8EF1] hover:bg-[#6a7ce0]'} text-white`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  {isConnected ? 'Connected' : 'Connect'}
                </button>
                <button 
                  onClick={handleReset}
                  className="border border-teal-400 p-2.5 rounded text-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/10 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                </button>
              </div>
            </div>

            {/* Select Folder Section */}
            <div className="lg:col-span-3">
              <div className="flex items-center gap-2 mb-2 text-gray-400 dark:text-gray-500">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" /></svg>
                <label className="text-xs font-bold uppercase tracking-wider">Select Folder</label>
              </div>
              <div className="space-y-3">
                <div className="relative">
                  <select 
                    value={selectedFolder}
                    disabled={!isConnected}
                    onChange={(e) => setSelectedFolder(e.target.value)}
                    className="w-full h-11 px-4 border border-gray-300 dark:border-gray-600 rounded bg-transparent text-gray-700 dark:text-gray-200 text-sm outline-none appearance-none disabled:opacity-50 transition-all focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select folder...</option>
                    <option value="inbox">Inbox</option>
                    <option value="sent">Sent Items</option>
                    <option value="junk">Junk Email</option>
                    <option value="archive">Archive</option>
                  </select>
                  <div className="absolute right-3 top-3.5 pointer-events-none text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <button 
                  onClick={handleValidate}
                  disabled={!isConnected || !selectedFolder || loading}
                  className={`w-full h-11 flex items-center justify-center gap-2 rounded text-white font-bold transition-all shadow-sm ${isConnected && selectedFolder ? 'bg-[#76D7AC] hover:bg-[#64c59a]' : 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed opacity-60'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                  Validate
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl mb-6 flex items-center animate-shake">
          <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 border-4 border-[#4169E1] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">Communicating with Gmail...</p>
        </div>
      )}

      {isValidated && !loading && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden animate-slide-up">
          <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest text-[10px]">Extraction Results: {emails.length} Messages found</h3>
            <button className="text-red-500 text-[10px] font-bold hover:underline uppercase tracking-tighter" onClick={() => setIsValidated(false)}>Clear Preview</button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar">
            {emails.length > 0 ? (
              emails.map((email) => (
                <div key={email.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{email.sender}</span>
                      <span className="text-[10px] text-gray-400 font-medium uppercase">{email.date}</span>
                    </div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-1 truncate">{email.subject}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 italic">{email.snippet}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-gray-400 italic">
                No messages found in the selected folder.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GmailExtractor;
