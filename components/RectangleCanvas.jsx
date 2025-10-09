"use client";
import React, { useRef, useState, useEffect } from "react";

export default function RectangleCanvas({ userId }) {
  const canvasRef = useRef(null);
  const [rects, setRects] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);

  // Undo / Redo stacks
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  // 🧠 Load rectangles from DB on mount
  useEffect(() => {
    if (!userId) return;
    fetch(`/api/whiteboard?userId=${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.shapes) setRects(data.shapes);
      })
      .catch((err) => console.error("Error loading board:", err));
  }, [userId]);

  // 💾 Auto-save rectangles to DB when changed (debounced)
  useEffect(() => {
    if (!userId) return;
    const timeout = setTimeout(() => {
      fetch("/api/whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, shapes: rects }),
      }).catch((err) => console.error("Error saving:", err));
    }, 800); // debounce to prevent spamming requests
    return () => clearTimeout(timeout);
  }, [rects, userId]);

  // 🧰 Add a new history snapshot for undo
  const pushHistory = (newRects) => {
    setHistory((prev) => [...prev, rects]);
    setRedoStack([]);
    setRects(newRects);
  };

  const undo = () => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setRedoStack((r) => [rects, ...r]);
    setRects(last);
    setHistory((h) => h.slice(0, -1));
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    setHistory((h) => [...h, rects]);
    setRects(next);
    setRedoStack((r) => r.slice(1));
  };

  // ✏️ Handle mouse down (start rectangle)
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setDrawing(true);
  };

  // 📐 Handle mouse move (draw preview)
  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    const tempRect = {
      ...startPos,
      width,
      height,
      id: "temp",
      color: "rgba(0, 150, 255, 0.5)",
    };

    drawCanvas([...rects, tempRect]);
  };

  // 🟦 Handle mouse up (finalize rectangle)
  const handleMouseUp = (e) => {
    if (!drawing || !startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;

    const width = currentX - startPos.x;
    const height = currentY - startPos.y;

    const newRect = {
      id: Date.now(),
      x: startPos.x,
      y: startPos.y,
      width,
      height,
      color: randomColor(),
    };

    pushHistory([...rects, newRect]);
    setStartPos(null);
    setDrawing(false);
  };

  // 🎨 Draw all rectangles on canvas
  const drawCanvas = (rectArray = rects) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    rectArray.forEach((r) => {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x, r.y, r.width, r.height);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.width, r.height);
    });
  };

  // Random color generator
  const randomColor = () =>
    `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;

  // Redraw whenever rects change
  useEffect(() => {
    drawCanvas();
  }, [rects]);

  // Resize canvas dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight - 80;
      drawCanvas();
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Keyboard shortcuts (Ctrl+Z, Ctrl+Y)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [undo, redo]);

  return (
    <div className="relative w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />
      <div className="absolute top-3 left-3 flex gap-3">
        <button
          onClick={undo}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
        >
          Undo
        </button>
        <button
          onClick={redo}
          className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700"
        >
          Redo
        </button>
      </div>
    </div>
  );
}
