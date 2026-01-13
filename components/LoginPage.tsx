import React, { useState } from 'react';
import { TelegramIcon } from './icons/TelegramIcon';
import { User, LogIn } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (username: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  
  const authorizedUsers = [
    '@ems_yassine',
    '@adnaneelassamEMS',
    '@Ayoubbelabid',
    '@ayoub_ben',
    '@bilalelbiyaali',
    '@boulehjour1',
    '@Gha_khalid',
    '@mouadlahrech',
    '@Anas_izmaz',
    '@mostapha01'
  ].map(u => u.toLowerCase());

  const handleLogin = () => {
    const formattedUsername = (username.trim().startsWith('@') ? username.trim() : `@${username.trim()}`).toLowerCase();
    
    if (!username.trim()) {
      setError('Please enter your Telegram username.');
      return;
    }

    if (authorizedUsers.includes(formattedUsername)) {
        setError('');
        // Successful login for the authorized user
        onLoginSuccess(formattedUsername);
    } else {
        setError('Invalid username. Access is restricted to authorized users.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 transition-colors duration-300">
      <div className="w-full max-w-sm">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-8">
          <div className="text-center">
            <div className="mx-auto mb-6 bg-blue-500 rounded-full h-16 w-16 flex items-center justify-center shadow-lg border-4 border-white dark:border-gray-800">
              <h1 className="text-3xl font-bold text-white tracking-tight">E</h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
              Welcome to EMS3 Tools
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
              Please sign in with your Telegram account.
            </p>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }}>
            <div className="relative mb-4">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18}/>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-lg pl-10 pr-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                aria-label="Telegram Username"
              />
            </div>

            {error && <p className="text-xs text-red-500 mb-4 text-center">{error}</p>}

            <button
              type="submit"
              className="w-full bg-[#2AABEE] hover:bg-[#1A94D6] text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg shadow-blue-500/20 hover:shadow-xl active:scale-95 disabled:opacity-50"
              disabled={!username.trim()}
            >
              <TelegramIcon className="h-6 w-6" />
              <span>Login with Telegram</span>
            </button>
          </form>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-6 text-center">
            This is a simulated authentication for demonstration.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;