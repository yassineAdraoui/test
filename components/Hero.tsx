
import React from 'react';
import { PlayIcon } from './icons/PlayIcon';

const Hero: React.FC = () => {
  return (
    <section id="home" className="min-h-screen flex items-center justify-center bg-gray-50 pt-16">
      <div className="text-center max-w-3xl mx-auto px-6">
        <h2 className="text-4xl md:text-6xl font-extrabold text-gray-800 leading-tight mb-4">
          Clean & Professional
        </h2>
        <p className="text-lg md:text-xl text-gray-500 mb-8">
          We are a team of talented designers making websites with the latest technologies. Our goal is to create modern and responsive websites for our clients.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#about"
            className="bg-blue-600 text-white px-8 py-3 rounded-full font-semibold text-lg hover:bg-blue-700 transition-transform duration-300 hover:scale-105 shadow-lg"
          >
            Get Started
          </a>
          <a
            href="#"
            className="flex items-center gap-2 text-blue-600 px-8 py-3 rounded-full font-semibold text-lg hover:text-blue-800 transition-colors duration-300 group"
          >
            <PlayIcon className="transform group-hover:scale-110 transition-transform duration-300" />
            <span>Watch Video</span>
          </a>
        </div>
      </div>
    </section>
  );
};

export default Hero;
