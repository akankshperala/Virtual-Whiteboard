'use client';

import { useState } from 'react';
import { FaSave, FaDownload, FaShare, FaPlay } from 'react-icons/fa';
import { FiMoreVertical } from 'react-icons/fi';

export default function TopBar() {
  const [isOpen, setIsOpen] = useState(false);

  const buttonClass = `
    group relative inline-flex items-center justify-center 
    px-3 py-1.5 rounded-full font-semibold text-white text-sm md:text-base
    bg-black/70 border border-purple-500/60
    transition-all duration-300
    hover:border-purple-500 hover:shadow-[0_4px_20px_-4px_rgba(168,85,247,0.5)]
    hover:scale-105
  `;

  const iconClass = `
    relative z-10 transition-transform duration-300 group-hover:scale-110
  `;

  return (
    <div className="absolute top-4 right-10 md:right-15 flex gap-2 md:gap-3 lg:gap-4">
      {/* Show buttons normally on md+ */}
      <div className="hidden sm:flex gap-3">
        <button className={buttonClass}>
          <FaSave size={14} className={iconClass} />
        </button>
        <button className={buttonClass}>
          <FaDownload size={14} className={iconClass} />
        </button>
        <button className={buttonClass}>
          <FaShare size={14} className={iconClass} />
        </button>
        <button className={buttonClass}>
          <FaPlay size={14} className={iconClass} />
        </button>
      </div>

      {/* Mobile Dropdown */}
      <div className="sm:hidden relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={buttonClass}
        >
          <FiMoreVertical size={16} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-36 bg-black/80 backdrop-blur-md border border-purple-500/60 rounded-lg shadow-lg p-2 flex flex-col gap-2 z-50">
            <button className={buttonClass}>
              <FaSave size={14} className={iconClass} /> <span className="ml-2">Save</span>
            </button>
            <button className={buttonClass}>
              <FaDownload size={14} className={iconClass} /> <span className="ml-2">Download</span>
            </button>
            <button className={buttonClass}>
              <FaShare size={14} className={iconClass} /> <span className="ml-2">Share</span>
            </button>
            <button className={buttonClass}>
              <FaPlay size={14} className={iconClass} /> <span className="ml-2">Play Mode</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
