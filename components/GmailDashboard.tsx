
import React, { useState, useEffect, useCallback } from 'react';

// --- Types ---
interface EmailMessage {
  id: string;
  threadId: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

// --- Constants ---
// CRITICAL: Replace this with your CLIENT ID from Google Cloud Console (APIs & Services > Credentials)
const CLIENT_ID = '911521351538-bbtc3d4fnc0ds3t654gsse28u13tg797.apps.googleusercontent.com'; 
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

const GmailDashboard: React.FC = () => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('gmail_token'));
  const [inboxEmails, setInboxEmails] = useState<EmailMessage[]>([]);
  const [spamEmails, setSpamEmails] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshInterval, setRefreshInterval] = useState(5); // minutes
  const [activeTab, setActiveTab] = useState<'inbox' | 'spam'>('inbox');
  const [tokenClient, setTokenClient] = useState<any>(null);

  // Initialize Google Token Client
  useEffect(() => {
    if (CLIENT_ID.startsWith('YOUR_GOOGLE')) {
        console.warn('Gmail Monitor: You must provide a valid CLIENT_ID from Google Cloud Console.');
    }

    if ((window as any).google) {
      const client = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
              setError(`Auth Error: ${response.error} - ${response.error_description || ''}`);
              return;
          }
          if (response.access_token) {
            setToken(response.access_token);
            localStorage.setItem('gmail_token', response.access_token);
            setError(null);
          }
        },
      });
      setTokenClient(client);
    }
  }, []);

  const handleAuth = () => {
    if (tokenClient) {
      tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      setError('Google library not loaded. Check internet connection or if script is blocked.');
    }
  };

  const handleLogout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('gmail_token');
    setInboxEmails([]);
    setSpamEmails([]);
  }, []);

  const fetchEmailDetails = useCallback(async (messageId: string, accessToken: string) => {
    const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    
    if (!res.ok) {
        const errorData = await res.json();
        console.error('Message Detail Error:', errorData);
        if (res.status === 401) {
            throw new Error('Session expired or unauthorized. Please reconnect.');
        }
        throw new Error(`Failed to fetch message details: ${errorData.error?.message || res.status}`);
    }

    const data = await res.json();
    const headers = data.payload?.headers || [];
    const subject = headers.find((h: any) => h.name.toLowerCase() === 'subject')?.value || '(No Subject)';
    const from = headers.find((h: any) => h.name.toLowerCase() === 'from')?.value || '(Unknown)';
    const date = headers.find((h: any) => h.name.toLowerCase() === 'date')?.value || '';
    const isUnread = data.labelIds?.includes('UNREAD') || false;

    return {
      id: data.id,
      threadId: data.threadId,
      sender: from,
      subject,
      snippet: data.snippet || '',
      date: date ? new Date(date).toLocaleString() : 'Unknown Date',
      isUnread,
    };
  }, []);

  const fetchEmails = useCallback(async (label: string, accessToken: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
      url.searchParams.append('labelIds', label.toUpperCase());
      url.searchParams.append('maxResults', '20');

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        console.error('API Response Error:', errorData);
        if (res.status === 401) {
          throw new Error('Session expired or unauthorized. Please reconnect.');
        }
        throw new Error(`Gmail API error: ${errorData.error?.message || res.statusText}`);
      }

      const data = await res.json();
      if (!data.messages) return [];

      const detailedEmails = await Promise.all(
        data.messages.map((m: any) => fetchEmailDetails(m.id, accessToken))
      );
      return detailedEmails;
    } catch (err: any) {
      console.error('Fetch Emails Error:', err);
      if (err.message === 'Session expired or unauthorized. Please reconnect.') {
        handleLogout();
      }
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, [handleLogout, fetchEmailDetails]);

  const refreshAll = useCallback(async () => {
    if (!token) return;
    const inbox = await fetchEmails('INBOX', token);
    const spam = await fetchEmails('SPAM', token);
    setInboxEmails(inbox);
    setSpamEmails(spam);
  }, [token, fetchEmails]);

  // Initial fetch and auto-refresh
  useEffect(() => {
    if (token) {
      refreshAll();
      const interval = setInterval(refreshAll, refreshInterval * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [token, refreshInterval, refreshAll]);

  const filteredEmails = (activeTab === 'inbox' ? inboxEmails : spamEmails).filter(
    (email) =>
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.sender.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center transition-colors duration-300">
        <div className="bg-white dark:bg-gray-800 p-10 rounded-2xl shadow-xl max-w-md border border-gray-100 dark:border-gray-700">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">Connect Your Gmail</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-8">Access your Inbox and Spam in read-only mode for real-time monitoring.</p>
          
          {CLIENT_ID.startsWith('YOUR_GOOGLE') && (
              <div className="mb-6 p-4 bg-orange-50 dark:bg-orange-900/30 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 text-sm rounded-lg text-left">
                  <strong>Configuration Required:</strong> Update <code>CLIENT_ID</code> in <code>GmailDashboard.tsx</code>.
              </div>
          )}

          <button
            onClick={handleAuth}
            disabled={CLIENT_ID.startsWith('YOUR_GOOGLE')}
            className={`w-full font-bold py-3 px-6 rounded-xl transition-all shadow-lg ${
                CLIENT_ID.startsWith('YOUR_GOOGLE') 
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-blue-200/50'
            }`}
          >
            Authorize Access
          </button>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4">Read-only mode. No data stored.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 lg:px-8 transition-colors duration-300">
      {/* Header Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-600 p-2 rounded-lg">
             <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Gmail Monitor</h2>
            <div className="flex items-center text-sm text-green-500 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
              Live Tracking
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
             <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-gray-800 transition-all outline-none"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value={1}>1m</option>
            <option value={5}>5m</option>
            <option value={15}>15m</option>
          </select>

          <button
            onClick={refreshAll}
            disabled={loading}
            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </button>

          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl mb-6 flex items-center">
          <svg className="w-5 h-5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
          <div className="flex-1 text-sm">{error}</div>
        </div>
      )}

      {/* Main Content Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors duration-300">
        <div className="flex border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30">
          <button
            onClick={() => setActiveTab('inbox')}
            className={`flex-1 py-4 text-center font-bold transition-all relative ${
              activeTab === 'inbox' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Inbox
            {activeTab === 'inbox' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 dark:bg-blue-400 rounded-t-full"></div>}
            {inboxEmails.some(e => e.isUnread) && <span className="ml-2 w-2 h-2 bg-blue-500 rounded-full inline-block"></span>}
          </button>
          <button
            onClick={() => setActiveTab('spam')}
            className={`flex-1 py-4 text-center font-bold transition-all relative ${
              activeTab === 'spam' ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Spam
            {activeTab === 'spam' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-orange-600 dark:bg-orange-400 rounded-t-full"></div>}
            {spamEmails.some(e => e.isUnread) && <span className="ml-2 w-2 h-2 bg-orange-500 rounded-full inline-block"></span>}
          </button>
        </div>

        <div className="divide-y divide-gray-100 dark:divide-gray-700 overflow-y-auto max-h-[600px]">
          {loading && filteredEmails.length === 0 ? (
            <div className="p-20 flex flex-col items-center">
              <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-gray-500 dark:text-gray-400 font-medium">Syncing...</p>
            </div>
          ) : filteredEmails.length > 0 ? (
            filteredEmails.map((email) => (
              <div 
                key={email.id} 
                className={`p-4 md:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors flex flex-col md:flex-row gap-4 items-start ${email.isUnread ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
              >
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                    activeTab === 'inbox' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
                  }`}>
                    {email.sender.charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`text-base truncate max-w-[200px] md:max-w-none ${email.isUnread ? 'font-bold text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>
                      {email.sender}
                    </h4>
                    <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap ml-4">{email.date}</span>
                  </div>
                  <p className={`text-sm mb-1 ${email.isUnread ? 'font-semibold text-gray-800 dark:text-gray-200' : 'text-gray-700 dark:text-gray-400'}`}>
                    {email.subject}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2 md:line-clamp-1 italic">
                    {email.snippet}...
                  </p>
                </div>
                
                {email.isUnread && (
                  <div className="flex-shrink-0 self-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        activeTab === 'inbox' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' : 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300'
                    }`}>New</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-20 text-center text-gray-400 dark:text-gray-600">
              <svg className="w-12 h-12 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              <p>No emails found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GmailDashboard;
