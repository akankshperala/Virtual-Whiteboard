"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

export default function WhiteboardCanvas() {
  const { data: session, status } = useSession();
  const userId = session?.user?.email; // use unique identifier
  const canvasRef = useRef(null);

  const [shapes, setShapes] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState(null);
  const [tool, setTool] = useState("rectangle");
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  /** 🕒 Wait for session before rendering */
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-xl">
        Loading whiteboard...
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white text-xl">
        Please log in to access your whiteboard.
      </div>
    );
  }

  /** 🎯 Load shapes from DB once */
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`/api/whiteboard?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (data?.shapes) setShapes(data.shapes);
      } catch (err) {
        console.error("❌ Load error:", err);
      }
    };
    load();
  }, [userId]);

  /** 💾 Auto-save shapes */
  useEffect(() => {
    if (!userId || shapes.length === 0) return;
    const timer = setTimeout(() => {
      fetch("/api/whiteboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, shapes }),
      }).catch((err) => console.error("Save error:", err));
    }, 1000);
    return () => clearTimeout(timer);
  }, [shapes, userId]);

  /** 🧰 Undo / Redo */
  const pushHistory = (newShapes) => {
    setHistory((h) => [...h, shapes]);
    setRedoStack([]);
    setShapes(newShapes);
  };
  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [shapes, ...r]);
    setShapes(prev);
    setHistory((h) => h.slice(0, -1));
  };
  const redo = () => {
    if (!redoStack.length) return;
    const next = redoStack[0];
    setHistory((h) => [...h, shapes]);
    setShapes(next);
    setRedoStack((r) => r.slice(1));
  };

  /** 🖱️ Drawing events */
  const handleMouseDown = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setDrawing(true);
  };

  const handleMouseUp = (e) => {
    if (!drawing || !startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const newShape = {
      id: Date.now(),
      type: tool,
      color: randomColor(),
      ...getShapeCoords(tool, startPos, { x: endX, y: endY }),
    };
    pushHistory([...shapes, newShape]);
    setDrawing(false);
    setStartPos(null);
  };

  const handleMouseMove = (e) => {
    if (!drawing || !startPos) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const endX = e.clientX - rect.left;
    const endY = e.clientY - rect.top;

    const temp = {
      id: "temp",
      type: tool,
      color: "rgba(0, 180, 255, 0.5)",
      ...getShapeCoords(tool, startPos, { x: endX, y: endY }),
    };
    drawCanvas([...shapes, temp]);
  };

  /** 📐 Shape geometry */
  const getShapeCoords = (type, start, end) => {
    const width = end.x - start.x;
    const height = end.y - start.y;
    switch (type) {
      case "rectangle":
        return { x: start.x, y: start.y, width, height };
      case "circle":
        return {
          cx: start.x + width / 2,
          cy: start.y + height / 2,
          r: Math.sqrt(width ** 2 + height ** 2) / 2,
        };
      default:
        return {};
    }
  };

  /** 🎨 Draw shapes */
  const drawCanvas = (list = shapes) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    list.forEach((s) => {
      ctx.strokeStyle = s.color;
      ctx.fillStyle = s.color;
      ctx.lineWidth = 2;

      if (s.type === "rectangle") {
        ctx.fillRect(s.x, s.y, s.width, s.height);
        ctx.strokeRect(s.x, s.y, s.width, s.height);
      } else if (s.type === "circle") {
        ctx.beginPath();
        ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    });
  };

  useEffect(() => {
    drawCanvas();
  }, [shapes]);

  /** 🪄 Resize canvas */
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

  /** ⌨️ Keyboard shortcuts */
  useEffect(() => {
    const keyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") undo();
      else if ((e.ctrlKey || e.metaKey) && e.key === "y") redo();
    };
    window.addEventListener("keydown", keyHandler);
    return () => window.removeEventListener("keydown", keyHandler);
  }, [undo, redo]);

  const randomColor = () =>
    `hsl(${Math.floor(Math.random() * 360)}, 80%, 60%)`;

  /** ✅ Render whiteboard */
  return (
    <div className="relative w-full h-full bg-gray-900">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      />
      <div className="absolute top-3 left-3 flex gap-3 bg-gray-800/80 p-3 rounded-xl">
        {["rectangle", "circle"].map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className={`px-3 py-1 rounded-lg text-white capitalize ${
              tool === t ? "bg-blue-600" : "bg-gray-700 hover:bg-gray-600"
            }`}
          >
            {t}
          </button>
        ))}
        <button
          onClick={undo}
          className="bg-yellow-600 text-white px-3 py-1 rounded-lg hover:bg-yellow-700"
        >
          Undo
        </button>
        <button
          onClick={redo}
          className="bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
        >
          Redo
        </button>
      </div>
    </div>
  );
}
