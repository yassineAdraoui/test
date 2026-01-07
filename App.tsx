
import React from 'react';
import Header from './components/Header';
import EmailCleaner from './components/EmailCleaner';

const App: React.FC = () => {
  return (
    <div className="min-h-screen text-gray-800 bg-gray-50">
      <Header />
      <main className="pt-24">
        <EmailCleaner />
      </main>
    </div>
  );
};

export default App;
