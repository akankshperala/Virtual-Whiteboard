'use client';

import { Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { FaTools, FaPen, FaEraser, FaShapes, FaRegSquare, FaRegCircle, FaMinus, FaTrash, FaUndo, FaRedo, FaPalette, FaTimes } from 'react-icons/fa';

// Accept setActiveToolProp from parent (page.js)
export default function ToolBar({  setActiveToolProp, setColor, setStroke, setiserasing, iserasing, color }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTool, setActiveTool] = useState('pen'); // Set 'pen' as default active tool
  const toolbarRef = useRef(null);
  const toggleButtonRef = useRef(null);

  const toggleToolBar = () => {
    setIsOpen(!isOpen);
  };

  const handleToolClick = (toolName) => {
    // Toggles the active tool. If the same tool is clicked again, it closes the menu.
    const newTool = activeTool === toolName ? null : toolName;
    setActiveTool(newTool);
    setActiveToolProp(newTool); // Pass the active tool state up to the parent
  };

  // New function to handle selection of a sub-tool (like rectangle)
  const handleSubToolClick = (toolName) => {
    setActiveTool(toolName);
    setActiveToolProp(toolName); // Pass the specific sub-tool
    // Close the shapes submenu after selection, but keep the toolbar open
    setActiveTool('shapes'); // Keep 'shapes' highlighted in the main toolbar
  }

  const handleActionClick = () => {
    // This will close any active tool menu when an action button is clicked
    // We keep the last selected drawing tool active, for example 'pen'
    setActiveTool(prev => prev === 'eraser' ? 'eraser' : 'pen');
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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [toolbarRef, toggleButtonRef]);

  const colors = ['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFFF00', '#800080', '#FFA500'];
  const thicknesses = [2, 4, 6, 8, 10];
  const eraser_thicknesses = [10, 15, 20, 25];

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
              className={`p-3 rounded-lg transition-colors duration-200 ${activeTool === 'pen' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
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
                      <div key={t} onClick={() => setStroke(t)} className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-500">{t}</div>
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
              className={`p-3 rounded-lg transition-colors duration-200 ${activeTool === 'color' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Color"
            >
              <FaPalette size={20} className="text-gray-300 hover:text-white" />
            </button>
            {activeTool === 'color' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white flex flex-col gap-2 transition-all duration-200">
                <h4 className="text-xs font-semibold mb-1">Color</h4>
                <div className="flex gap-2">
                  {colors.map((c) => (
                    <div key={c} onClick={() => setColor(c)} className="w-5 h-5 rounded-full cursor-pointer border-2 border-transparent hover:border-white transition-all duration-200" style={{ backgroundColor: c }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Shapes Tool - Click sets activeTool to 'shapes' to show submenu */}
          <div className="relative">
            <button
              onClick={() => handleToolClick('shapes')}
              className={`p-3 rounded-lg transition-colors duration-200 ${activeTool === 'shapes' || activeTool === 'rectangle' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Shapes"
            >
              <FaShapes size={20} className="text-gray-300 hover:text-white" />
            </button>
            {/* Shapes Submenu - Show if 'shapes' is the current activeTool or a subtool is selected (like 'rectangle') */}
            {(activeTool === 'shapes' || activeTool === 'rectangle') && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white flex gap-2 transition-all duration-200">
                {/* Rectangle Button - IMPORTANT: onClick uses handleSubToolClick('rectangle') */}
                <button
                  onClick={() => handleSubToolClick('rectangle')}
                  className={`p-2 rounded-md transition-colors duration-200 ${activeTool === 'rectangle' ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                  title="Rectangle"
                >
                  <FaRegSquare size={20} />
                </button>
                <button onClick={() => handleSubToolClick('circle')}
                  className={`p-2 rounded-md transition-colors duration-200 ${activeTool === 'circle' ? 'bg-gray-600' : 'hover:bg-gray-700'}`}
                  title="Circle"><FaRegCircle size={20} /></button>
                <button className="p-2 rounded-md hover:bg-gray-700" title="Line"><FaMinus size={20} /></button>
              </div>
            )}
          </div>

          {/* Eraser Tool */}
          <div className="relative">
            <button
              onClick={() => {
                setColor("white")
                setStroke(15)
              }}
              className={`p-3 rounded-lg transition-colors duration-200 ${activeTool === 'eraser' ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
              title="Eraser"
            >
              <FaEraser size={20} onClick={() => {
                setiserasing(!iserasing)
                handleToolClick("eraser")
              }} className="text-gray-300 hover:text-white" />
            </button>
            {color === 'white' && (
              <div className="absolute top-1/2 -right-2 -translate-y-1/2 translate-x-full bg-gray-800 p-3 rounded-lg shadow-xl text-white transition-all duration-200">
                <div>
                  <h4 className="text-xs font-semibold mb-1">Thickness</h4>
                  <div className="flex gap-2 mb-2">
                    {eraser_thicknesses.map((t) => (
                      <div key={t} onClick={() => setStroke(t)} className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-xs cursor-pointer hover:bg-gray-500">{t}</div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="w-8 h-px bg-gray-700 my-2"></div>

          {/* Action Buttons */}
          <button onClick={()=>handleToolClick("clearall")} className="p-3 rounded-lg hover:bg-red-600 transition-colors duration-200" title="Clear All">
            <FaTrash size={20} className="text-red-400 hover:text-white" />
          </button>
          <button onClick={()=>handleToolClick("clearone")} className="p-3 rounded-lg hover:bg-red-600 transition-colors duration-200" title="Clear One">
            <FaTimes size={20} className="text-red-400 hover:text-white" />
          </button>

          <button onClick={()=>handleToolClick("undo")} className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200" title="Undo">
            <FaUndo size={20} className="text-gray-300 hover:text-white" />
          </button>

          <button onClick={()=>handleToolClick("redo")} className="p-3 rounded-lg hover:bg-gray-700 transition-colors duration-200" title="Redo">
            <FaRedo size={20} className="text-gray-300 hover:text-white" />
          </button>
        </div>
      )}
    </div>
  );
}