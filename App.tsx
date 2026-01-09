
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import EmailCleaner from './components/EmailCleaner';
import GmailExtractor from './components/GmailExtractor';
import TextExtractor from './components/TextExtractor'; // Replaced CodeDiff
import DataCollector from './components/DataCollector';
import TelegramSettings from './components/TelegramSettings';

type Page = 'cleaner' | 'extractor' | 'textExtractor' | 'collector'; // Changed 'diff' to 'textExtractor'

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('cleaner');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark' || 
      (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Header 
        onNavigate={setCurrentPage} 
        currentPage={currentPage} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode}
        onOpenTelegramSettings={() => setIsTelegramModalOpen(true)}
      />
      <main className="pt-24 pb-12">
        {currentPage === 'cleaner' && <EmailCleaner />}
        {currentPage === 'extractor' && <GmailExtractor />}
        {currentPage === 'textExtractor' && <TextExtractor />} 
        {currentPage === 'collector' && <DataCollector />} 
      </main>
      <TelegramSettings 
        isOpen={isTelegramModalOpen}
        onClose={() => setIsTelegramModalOpen(false)}
      />
    </div>
  );
};

export default App;
