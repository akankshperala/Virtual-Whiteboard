'use client';

import { useState } from 'react';
import TopBar from "@/components/TopBar";
import ToolBar from "@/components/ToolBar";
import WhiteboardCanvas from "@/components/Whiteboardcanvas";
import Menubar from "@/components/Menubar";

export default function Page() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // NEW: State to track the currently active drawing tool
  const [activeTool, setActiveTool] = useState('pen'); 
  const [color, setColor] = useState("black")
  const [stroke, setStroke] = useState(2)
  const [iserasing, setiserasing] = useState(true)

  return (
    <div className="w-screen h-screen relative overflow-hidden bg-amber-100">
      <div className="relative h-full w-full bg-black">
        {/* Background grid */}
        <div className="absolute bottom-0 left-0 right-0 top-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]">
          
          {/* Menubar */}
          <Menubar isOpen={isMenuOpen} setIsOpen={setIsMenuOpen} />

          {/* Centered Top Title */}
          <h1 className="absolute top-4 left-1/2 transform -translate-x-1/2 text-white text-xl font-semibold">
            Hello im varun from cse2
          </h1>

          {/* TopBar */}
          <TopBar />

          {/* Whiteboard - Pass activeTool state */}
          <WhiteboardCanvas activeTool={activeTool} color={color} stroke={stroke} iserasing={iserasing}/>

          {/* Toolbar - Pass setter function to update active tool state */}
         
          <ToolBar isMenuOpen={isMenuOpen} setColor={setColor} setStroke={setStroke} setiserasing={setiserasing} iserasing={iserasing} setActiveToolProp={setActiveTool} color={color}/>

        </div>
      </div>
    </div>
  );
}