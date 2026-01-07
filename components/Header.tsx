
import React from 'react';

const Header: React.FC = () => {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-white shadow-md"
    >
      <div className="container mx-auto px-6 py-4 flex items-center">
        <h1 className="text-3xl font-bold text-blue-600">
          EMS3
        </h1>
      </div>
    </header>
  );
};

export default Header;
