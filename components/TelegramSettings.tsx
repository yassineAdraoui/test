
import React, { useState, useEffect } from 'react';
import { Bell, Key, Hash, X, Send, Save, Trash2, CheckCircle, AlertTriangle } from 'lucide-react';

interface TelegramSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

// Provided default credentials
const DEFAULT_BOT_TOKEN = '8582110216:AAEIXG-w8Cj4u0cF4TtWlyHDLvgmX4mv8q4';
const DEFAULT_CHAT_ID = '1687140879';

const TELEGRAM_BOT_TOKEN_KEY = 'telegram_bot_token';
const TELEGRAM_CHAT_ID_KEY = 'telegram_chat_id';
const TELEGRAM_API_URL = 'https://api.telegram.org/bot';

/**
 * Sends a .txt file notification to a Telegram chat.
 * Uses hardcoded defaults if localStorage is empty.
 */
export const sendTelegramNotification = async (title: string, content: string, filename: string = 'result.txt'): Promise<boolean> => {
  const token = localStorage.getItem(TELEGRAM_BOT_TOKEN_KEY) || DEFAULT_BOT_TOKEN;
  const chatId = localStorage.getItem(TELEGRAM_CHAT_ID_KEY) || DEFAULT_CHAT_ID;

  if (!token || !chatId) {
    console.warn('Telegram notifier: Credentials missing.');
    return false;
  }

  try {
    const blob = new Blob([content], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', blob, filename);
    formData.append('caption', title);

    const response = await fetch(`${TELEGRAM_API_URL}${token}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    if (!data.ok) {
      console.error('Telegram API rejected the request:', data);
      return false;
    }
    return true;
  } catch (error) {
    console.error('Network error while sending to Telegram:', error);
    return false;
  }
};

const TelegramSettings: React.FC<TelegramSettingsProps> = ({ isOpen, onClose }) => {
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  // Auto-initialize with defaults if nothing exists
  useEffect(() => {
    const storedToken = localStorage.getItem(TELEGRAM_BOT_TOKEN_KEY);
    const storedId = localStorage.getItem(TELEGRAM_CHAT_ID_KEY);
    
    if (!storedToken) {
      localStorage.setItem(TELEGRAM_BOT_TOKEN_KEY, DEFAULT_BOT_TOKEN);
      setBotToken(DEFAULT_BOT_TOKEN);
    } else {
      setBotToken(storedToken);
    }

    if (!storedId) {
      localStorage.setItem(TELEGRAM_CHAT_ID_KEY, DEFAULT_CHAT_ID);
      setChatId(DEFAULT_CHAT_ID);
    } else {
      setChatId(storedId);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setBotToken(localStorage.getItem(TELEGRAM_BOT_TOKEN_KEY) || DEFAULT_BOT_TOKEN);
      setChatId(localStorage.getItem(TELEGRAM_CHAT_ID_KEY) || DEFAULT_CHAT_ID);
      setTestStatus('idle');
      setTestMessage('');
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem(TELEGRAM_BOT_TOKEN_KEY, botToken);
    localStorage.setItem(TELEGRAM_CHAT_ID_KEY, chatId);
    onClose();
  };

  const handleClear = () => {
    localStorage.removeItem(TELEGRAM_BOT_TOKEN_KEY);
    localStorage.removeItem(TELEGRAM_CHAT_ID_KEY);
    setBotToken('');
    setChatId('');
  };

  const handleTest = async () => {
    setTestStatus('testing');
    setTestMessage('');

    // Use values currently in state for testing (allows previewing before save)
    const currentToken = botToken || DEFAULT_BOT_TOKEN;
    const currentId = chatId || DEFAULT_CHAT_ID;

    if (!currentToken || !currentId) {
      setTestStatus('error');
      setTestMessage('Please enter both Bot Token and Chat ID.');
      return;
    }

    try {
      const blob = new Blob(['✅ Success! Automatic connection is active.'], { type: 'text/plain' });
      const formData = new FormData();
      formData.append('chat_id', currentId);
      formData.append('document', blob, 'test_file.txt');
      formData.append('caption', 'EMS3 Connection Test');
      
      const response = await fetch(`${TELEGRAM_API_URL}${currentToken}/sendDocument`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();
      if (!data.ok) {
        setTestStatus('error');
        setTestMessage(`Error: ${data.description}`);
        console.error('Telegram test failed:', data);
      } else {
        setTestStatus('success');
        setTestMessage('Test file sent! Check your Telegram.');
      }
    } catch (error) {
      setTestStatus('error');
      setTestMessage('Network error. See console.');
      console.error('Test request failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bell className="text-blue-500" />
            <h2 className="text-xl font-bold dark:text-white">Telegram Settings</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
            <strong>Connected Automatically:</strong> Using your default bot credentials. You can update them below if needed.
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-600 dark:text-gray-400 block mb-2">Bot Token</label>
              <input
                type="password"
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={DEFAULT_BOT_TOKEN}
                className="w-full px-4 py-2 border dark:bg-gray-900 dark:border-gray-600 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 dark:text-gray-400 block mb-2">Chat ID</label>
              <input
                type="text"
                value={chatId}
                onChange={(e) => setChatId(e.target.value)}
                placeholder={DEFAULT_CHAT_ID}
                className="w-full px-4 py-2 border dark:bg-gray-900 dark:border-gray-600 dark:text-white rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={testStatus === 'testing'}
              className="flex-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors dark:text-white"
            >
              {testStatus === 'testing' ? 'Sending...' : 'Test Connection'}
            </button>
            <button onClick={handleClear} title="Reset to empty" className="bg-red-50 dark:bg-red-900/30 text-red-600 p-2 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={20}/></button>
          </div>

          {testMessage && (
            <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testStatus === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-700' : 'bg-red-50 dark:bg-red-900/20 text-red-700'}`}>
              {testStatus === 'success' ? <CheckCircle size={16}/> : <AlertTriangle size={16}/>}
              {testMessage}
            </div>
          )}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3 border-t dark:border-gray-700">
          <button onClick={onClose} className="px-4 py-2 font-bold text-gray-500 hover:text-gray-700">Close</button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md transition-transform active:scale-95">Update Credentials</button>
        </div>
      </div>
    </div>
  );
};

export default TelegramSettings;
