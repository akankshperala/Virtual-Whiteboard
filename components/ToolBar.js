'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTools, FaPen, FaEraser, FaShapes, FaRegSquare, FaRegCircle, FaMinus, FaTrash, FaUndo, FaRedo, FaPalette } from 'react-icons/fa';

export default function ToolBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const toolbarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const toggleToolBar = () => {
    setIsOpen(!isOpen);
    if (isOpen) {
      setActiveTool(null);
    }
  };

  const handleToolClick = (toolName) => {
    // Toggles the active tool. If the same tool is clicked again, it closes the menu.
    setActiveTool(activeTool === toolName ? null : toolName);
  };
  
  const handleActionClick = () => {
    // This will close any active tool menu when an action button is clicked
    setActiveTool(null);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
        setActiveTool(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolbarRef, toggleButtonRef]);

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#800080', '#FFA500'];
  const thicknesses = [2, 4, 6, 8, 10];

  return (
    <div className="fixed top-24 left-4 z-30">
      {/* Main button to toggle the entire toolbar dropdown */}
      <button
        ref={toggleButtonRef}
        onClick={toggleToolBar}
        className="p-3 rounded-xl bg-gray-950 text-gray-300 hover:bg-gray-700 transition-colors duration-200 shadow-lg"
        title="Toggle Toolbar"
      >
        <FaTools size={20} />
      </button>

      {/* The main toolbar dropdown, shown when 'isOpen' is true */}
      {isOpen && (
        <div
          ref={toolbarRef}
          className="mt- flex flex-col items-center gap-3 bg-gray-950 shadow-lg px-2 py-4 rounded-xl transition-all duration-300 ease-in-out transform origin-top translate-y-0 opacity-100"
        >

          {/* Pen Tool */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('pen')}
              className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              title="Pen"
            >
              <FaPen size={20} className="text-gray-300 hover:text-white" />
            </button>
            {activeTool === 'pen' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white flex flex-col gap-2 transition-all duration-200">
                <div>
                  <h4 className="text-xs font-semibold mb-1">Thickness</h4>
                  <div className="flex gap-2 mb-2">
                    {thicknesses.map((t) => (
                      <div key={t} className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-500">{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* New Color Tool */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('color')}
              className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              title="Color"
            >
              <FaPalette size={20} className="text-gray-300 hover:text-white" />
            </button>
            {activeTool === 'color' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white flex flex-col gap-2 transition-all duration-200">
                <h4 className="text-xs font-semibold mb-1">Color</h4>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <div key={c} className="w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:border-white transition-all duration-200" style={{ backgroundColor: c }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shapes Tool */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('shapes')}
              className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              title="Shapes"
            >
              <FaShapes size={20} className="text-gray-300 hover:text-white" />
            </button>
            {activeTool === 'shapes' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white flex gap-2 transition-all duration-200">
                <button className="p-2 rounded-md hover:bg-gray-700"><FaRegSquare size={20} /></button>
                <button className="p-2 rounded-md hover:bg-gray-700"><FaRegCircle size={20} /></button>
                <button className="p-2 rounded-md hover:bg-gray-700"><FaMinus size={20} /></button>
              </div>
            )}
          </div>

          {/* Eraser Tool */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('eraser')}
              className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200"
              title="Eraser"
            >
              <FaEraser size={20} className="text-gray-300 hover:text-white" />
            </button>
            {activeTool === 'eraser' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white transition-all duration-200">
                <h4 className="text-xs font-semibold mb-1">Eraser Size</h4>
                <input type="range" min="1" max="10" className="w-24 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer" />
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-gray-700 my-2"></div>

          {/* Action Buttons */}
          <button onClick={handleActionClick} className="p-3 rounded-lg hover:bg-red-600 transition-colors duration-200" title="Clear All">
            <FaTrash size={20} className="text-red-400 hover:text-white" />
          </button>

          <button onClick={handleActionClick} className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200" title="Undo">
            <FaUndo size={20} className="text-gray-300 hover:text-white" />
          </button>

          <button onClick={handleActionClick} className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200" title="Redo">
            <FaRedo size={20} className="text-gray-300 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
}