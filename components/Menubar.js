'use client';

import { useState } from 'react';
import { FaBars, FaTimes, FaPlus, FaSearch, FaUserCircle, FaEllipsisV, FaShare, FaPencilAlt, FaTrash } from 'react-icons/fa';
import { SiOpenai } from "react-icons/si";

export default function Menubar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openFileMenu, setOpenFileMenu] = useState(null);
  const userName = "Varun Joshi";
  const userInitial = userName.charAt(0).toUpperCase();

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setOpenFileMenu(null);
    }
  };

  const toggleFileMenu = (fileName) => {
    setOpenFileMenu(openFileMenu === fileName ? null : fileName);
  };

  const fileActions = [
    { name: 'Share', icon: FaShare },
    { name: 'Rename', icon: FaPencilAlt },
    { name: 'Delete', icon: FaTrash },
  ];

  const recentFiles = [
    'Project Plan', 'Mind Map for UI', 'Team Meeting Notes',
    'Flowchart v1.2', 'User Flows Sketch', 'Product Roadmap Q3',
    'Feature Brainstorm', 'Marketing Strategy', 'Client Presentation',
    'Architectural Diagram',
  ];

  return (
    <>
      {/* Hamburger menu button */}
      {!isOpen && (
        <button onClick={toggleMenu} className="fixed top-4 left-4 z-50 p-1 w-3 cursor-pointer h-3 text-white rounded-full shadow-md">
          <FaBars size={20} />
        </button>
      )}

      {/* The Sidebar (4 Containers) */}
      <aside className={`fixed top-0 text-sm md:text-lg left-0 h-full w-47 md:w-64 bg-gray-950 text-white flex flex-col z-40
          transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Top Section */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold">Whiteboard</h1>
          </div>
          <button onClick={toggleMenu} className="p-2">
            <FaTimes size={20} />
          </button>
        </div>
        {/* New Button */}
        <div className="p-4 border-b border-gray-700">
          <button className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-700">
            <FaPlus />
            <span className="font-medium">New</span>
          </button>
        </div>
        {/* Recent Files Container */}
        <div className="flex-grow p-4 flex flex-col overflow-hidden">
          <div className="relative mb-4">
            <input type="text" placeholder="Search" className="w-full pl-10 pr-4 py-2 text-sm text-white bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
          <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Files</h3>
          <ul className="space-y-1 flex-grow overflow-y-auto scrollbar-hide">
            {recentFiles.map((file, index) => (
              <li key={index} className="relative">
                <a href="#" className="block py-2 px-3 rounded-lg hover:bg-gray-800 flex justify-between items-center">
                  <span>{file}</span>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.preventDefault(); toggleFileMenu(file); }} className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white">
                      <FaEllipsisV />
                    </button>
                  </div>
                </a>
                {openFileMenu === file && (
                  <div className="absolute right-0 top-10 w-24 bg-gray-800 rounded-lg shadow-xl text-white overflow-hidden z-20">
                    {fileActions.map(action => (
                      <button 
                        key={action.name} 
                        className="w-full px-3 py-2 text-left hover:bg-gray-700 flex items-center gap-2"
                        onClick={() => {
                          // Handle the action (e.g., share, rename, delete)
                          console.log(`${action.name}ing file: ${file}`);
                          setOpenFileMenu(null);
                        }}
                      >
                        <action.icon size={12} />
                        <span className="text-xs">{action.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
        {/* User Info Container */}
        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-lg">
                {userInitial}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{userName}</span>
                <span className="text-xs text-gray-400">Free</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay to close menu on outside click */}
      {isOpen && <div onClick={toggleMenu} className="fixed inset-0 bg-black opacity-80 z-30"></div>}
    </>
  );
}