"use client";
import { useEffect, useRef } from "react";
import { addstrokes, getstrokes, updateStrokes } from "@/app/actions/useractions";

export default function WhiteboardCanvas({ setActiveTool,activeTool, color, stroke }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  // shape storage
  const rectangles = useRef([]);
  const circles = useRef([]);
  const penStrokes = useRef([]);

  // selection
  const currentShape = useRef(null); // used while interacting
  const lastSelected = useRef(null);  // persists after mouseup (for Clear One)

  // history tree
  const historyRoot = useRef(null); // node structure { id, snapshot, parentId, childrenIds, createdAt }
  const nodesMap = useRef({}); // id -> node
  const currentNodeId = useRef(null);

  // drawing flags
  const isDrawing = useRef(false);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const currentProps = useRef({ activeTool, color, stroke });
  useEffect(() => {
    console.log(activeTool)
    if (activeTool=="clearone") {
      clearOne()
      setActiveTool("pen")
    }
    if (activeTool=="clearall"){
      clearAll()
      setActiveTool("pen")
    }
    if (activeTool=="undo"){
      undo()
      setActiveTool("pen")
    }
    if (activeTool=="redo"){
      redo()
      setActiveTool("pen")
    }
    currentProps.current = { activeTool, color, stroke };

  }, [activeTool, color, stroke]);

  const handleRadius = 6;

  // ---------------------------
  // Helpers: history tree utils
  // ---------------------------
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const makeSnapshot = () => ({
    rectangles: JSON.parse(JSON.stringify(rectangles.current)),
    circles: JSON.parse(JSON.stringify(circles.current)),
    penStrokes: JSON.parse(JSON.stringify(penStrokes.current)),
  });

  const persistHistoryToLocal = () => {
    try {
      const payload = {
        nodes: Object.values(nodesMap.current).map((n) => ({
          id: n.id,
          parentId: n.parentId,
          childrenIds: n.childrenIds,
          snapshot: n.snapshot,
          createdAt: n.createdAt,
        })),
        currentId: currentNodeId.current,
      };
      localStorage.setItem("wb_history_tree", JSON.stringify(payload));
    } catch (e) {
      console.warn("persistHistory failed", e);
    }
  };

  const restoreHistoryFromLocal = () => {
    try {
      const raw = localStorage.getItem("wb_history_tree");
      if (!raw) return false;
      const payload = JSON.parse(raw);
      nodesMap.current = {};
      payload.nodes.forEach((n) => {
        nodesMap.current[n.id] = {
          id: n.id,
          parentId: n.parentId,
          childrenIds: n.childrenIds || [],
          snapshot: n.snapshot,
          createdAt: n.createdAt,
        };
      });
      currentNodeId.current = payload.currentId || Object.keys(nodesMap.current)[0] || null;
      return true;
    } catch (e) {
      console.warn("restoreHistory failed", e);
      return false;
    }
  };

  const initHistory = (initialSnapshot) => {
    const rootId = newId();
    const node = {
      id: rootId,
      parentId: null,
      childrenIds: [],
      snapshot: initialSnapshot,
      createdAt: Date.now(),
    };
    nodesMap.current = { [rootId]: node };
    historyRoot.current = node;
    currentNodeId.current = rootId;
    persistHistoryToLocal();
  };

  const saveState = (fromUser = true) => {
    const snap = makeSnapshot();
    const id = newId();
    const parentId = currentNodeId.current;
    const node = {
      id,
      parentId,
      childrenIds: [],
      snapshot: snap,
      createdAt: Date.now(),
    };
    nodesMap.current[id] = node;
    if (parentId && nodesMap.current[parentId]) {
      nodesMap.current[parentId].childrenIds.push(id);
    }
    currentNodeId.current = id;
    persistHistoryToLocal();
  };

  const restoreNode = (nodeId) => {
    const node = nodesMap.current[nodeId];
    if (!node || !node.snapshot) return;
    rectangles.current = JSON.parse(JSON.stringify(node.snapshot.rectangles || []));
    circles.current = JSON.parse(JSON.stringify(node.snapshot.circles || []));
    penStrokes.current = JSON.parse(JSON.stringify(node.snapshot.penStrokes || []));
    currentNodeId.current = nodeId;
    draw();
    persistHistoryToLocal();
  };

  const undo = () => {
    const cur = nodesMap.current[currentNodeId.current];
    if (!cur) return;
    const parentId = cur.parentId;
    if (!parentId) return;
    restoreNode(parentId);
  };

  const redo = () => {
    const cur = nodesMap.current[currentNodeId.current];
    if (!cur) return;
    const childId = cur.childrenIds && cur.childrenIds.length ? cur.childrenIds[cur.childrenIds.length - 1] : null;
    if (!childId) return;
    restoreNode(childId);
  };

  // ---------------------------
  // Drawing helpers / geometry
  // ---------------------------
  const pointInsideRect = (x, y, rect) =>
    x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;

  const pointInsideRectHandle = (x, y, rect) => {
    const hx = rect.x + rect.width;
    const hy = rect.y + rect.height;
    return Math.hypot(x - hx, y - hy) <= handleRadius;
  };

  const pointInCircle = (x, y, circle) => Math.hypot(x - circle.x, y - circle.y) <= circle.radius;

  const pointInCircleHandle = (x, y, circle) =>
    Math.hypot(x - (circle.x + circle.radius), y - circle.y) <= handleRadius;

  // ---------------------------
  // draw everything
  // ---------------------------
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // pen strokes
    penStrokes.current.forEach((stroke) => {
      const points = stroke.arr || [];
      if (!Array.isArray(points) || points.length < 1) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => {
        if (p && typeof p.x === "number" && typeof p.y === "number") ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = stroke.color || "black";
      ctx.lineWidth = stroke.size || 2;
      ctx.stroke();
    });

    // rectangles
    rectangles.current.forEach((rect) => {
      if (!rect) return;
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(rect.x, rect.y, rect.width || 0, rect.height || 0);

      const isSel = lastSelected.current === rect || currentShape.current === rect;
      ctx.strokeStyle = isSel ? "#0077ff" : rect.color || "black";
      ctx.lineWidth = rect.size || 2;
      ctx.strokeRect(rect.x, rect.y, rect.width || 0, rect.height || 0);

      if (isSel) {
        ctx.beginPath();
        ctx.arc(rect.x + (rect.width || 0), rect.y + (rect.height || 0), handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#0077ff";
        ctx.fill();
      }
    });

    // circles
    circles.current.forEach((c) => {
      if (!c) return;
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.radius || 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fill();
      const isSel = lastSelected.current === c || currentShape.current === c;
      ctx.strokeStyle = isSel ? "#0077ff" : c.color || "black";
      ctx.lineWidth = c.size || 2;
      ctx.stroke();

      if (isSel) {
        ctx.beginPath();
        ctx.arc(c.x + (c.radius || 0), c.y, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#0077ff";
        ctx.fill();
      }
    });
  };

  // ---------------------------
  // canvas mount & event handlers
  // ---------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const resizeCanvas = () => {
      canvas.width = Math.floor(window.innerWidth * 0.9);
      canvas.height = Math.floor(window.innerHeight * 0.8);
      draw();
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // restore strokes from backend
    (async () => {
      try {
        const points = await getstrokes();
        if (Array.isArray(points) && points.length) {
          points.forEach((stroke) => {
            try {
              if (!stroke || !Array.isArray(stroke.points) || stroke.points.length === 0) return;
              const pts = stroke.points.filter((p) => p && typeof p.x === "number" && typeof p.y === "number");
              if (!pts.length) return;

              if (stroke.shape === "rectangle") {
                rectangles.current.push({
                  x: pts[0].x,
                  y: pts[0].y,
                  width: stroke.width || 0,
                  height: stroke.height || 0,
                  _id: stroke._id,
                });
              } else if (stroke.shape === "circle") {
                circles.current.push({
                  x: pts[0].x,
                  y: pts[0].y,
                  radius: stroke.points[1] ? Math.hypot(stroke.points[1].x - pts[0].x, stroke.points[1].y - pts[0].y) : 50,
                  _id: stroke._id,
                });
              } else {
                penStrokes.current.push({
                  arr: pts,
                  color: stroke.color,
                  size: stroke.size,
                  _id: stroke._id,
                });
              }
            } catch (e) {
              console.warn("skip stroke:", e);
            }
          });
        }
      } catch (err) {
        console.error("load strokes error", err);
      } finally {
        const restored = restoreHistoryFromLocal();
        if (restored && currentNodeId.current) {
          restoreNode(currentNodeId.current);
        } else {
          const initialSnap = makeSnapshot();
          initHistory(initialSnap);
          draw();
        }
      }
    })();

    // --- mouse & keyboard ---
    const getXY = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    const handleMouseDown = (e) => {
      const { x, y } = getXY(e);

      // select handles (resize)
      const rectHandle = rectangles.current.find((r) => pointInsideRectHandle(x, y, r));
      const circHandle = circles.current.find((c) => pointInCircleHandle(x, y, c));
      if (rectHandle || circHandle) {
        currentShape.current = rectHandle || circHandle;
        lastSelected.current = currentShape.current;
        isResizing.current = true;
        draw();
        return;
      }

      // select shape (drag)
      const rectShape = rectangles.current.find((r) => pointInsideRect(x, y, r));
      const circShape = circles.current.find((c) => pointInCircle(x, y, c));
      if (rectShape || circShape) {
        currentShape.current = rectShape || circShape;
        lastSelected.current = currentShape.current;
        isDragging.current = true;
        dragOffset.current = { x: x - currentShape.current.x, y: y - currentShape.current.y };
        draw();
        return;
      }

      // click outside → deselect
      currentShape.current = null;
      lastSelected.current = null;

      // create new shapes or pen strokes
      if (currentProps.current.activeTool === "rectangle") {
        const newRect = { x, y, width: 0, height: 0, color: currentProps.current.color, size: currentProps.current.stroke };
        rectangles.current.push(newRect);
        currentShape.current = newRect;
        lastSelected.current = newRect;
        isResizing.current = true;
        draw();
      } else if (currentProps.current.activeTool === "circle") {
        const newCircle = { x, y, radius: 0, color: currentProps.current.color, size: currentProps.current.stroke };
        circles.current.push(newCircle);
        currentShape.current = newCircle;
        lastSelected.current = newCircle;
        isResizing.current = true;
        draw();
      } else {
        isDrawing.current = true;
        const strokeObj = { arr: [{ x, y }], color: currentProps.current.color, size: currentProps.current.stroke };
        penStrokes.current.push(strokeObj);
        lastSelected.current = strokeObj;
        draw();
      }
    };

    const handleMouseMove = (e) => {
      const { x, y } = getXY(e);

      if (isDrawing.current) {
        const cur = penStrokes.current[penStrokes.current.length - 1];
        if (!cur) return;
        if (!Array.isArray(cur.arr)) cur.arr = [];
        cur.arr.push({ x, y });
        draw();
        return;
      }

      if (isResizing.current && currentShape.current) {
        if (rectangles.current.includes(currentShape.current)) {
          currentShape.current.width = x - currentShape.current.x;
          currentShape.current.height = y - currentShape.current.y;
        } else if (circles.current.includes(currentShape.current)) {
          currentShape.current.radius = Math.max(Math.hypot(x - currentShape.current.x, y - currentShape.current.y), 5);
        }
        draw();
        return;
      }

      if (isDragging.current && currentShape.current) {
        currentShape.current.x = x - dragOffset.current.x;
        currentShape.current.y = y - dragOffset.current.y;
        draw();
        return;
      }

      // hover selection (non-persistent)
      const hoverRect = rectangles.current.find((r) => pointInsideRect(x, y, r));
      const hoverCirc = circles.current.find((c) => pointInCircle(x, y, c));
      currentShape.current = hoverRect || hoverCirc || null;
      draw();
    };

    const handleMouseUp = async () => {
      const wasDrawing = isDrawing.current;
      const wasResizing = isResizing.current;
      const wasDragging = isDragging.current;

      isDrawing.current = false;
      isDragging.current = false;
      isResizing.current = false;

      if (wasDrawing) {
        const cur = penStrokes.current[penStrokes.current.length - 1];
        const points = cur?.arr || [];
        if (points.length > 0) {
          try {
            const res = await addstrokes({
              shape: "pen",
              color: cur.color,
              size: cur.size,
              arr: points,
            });
            if (res?._id) cur._id = res._id;
          } catch (err) {
            console.error("save pen error", err);
          }
        }
      }

      if (lastSelected.current) {
        const s = lastSelected.current;
        try {
          if (rectangles.current.includes(s)) {
            if (s._id) {
              await updateStrokes(s._id, {
                shape: "rectangle",
                color: s.color || "black",
                arr: [{ x: s.x, y: s.y }],
                width: s.width,
                height: s.height,
                type: "rectangle",
              });
            } else {
              const res = await addstrokes({
                shape: "rectangle",
                color: s.color || "black",
                arr: [{ x: s.x, y: s.y }],
                width: s.width,
                height: s.height,
                type: "rectangle",
              });
              if (res?._id) s._id = res._id;
            }
          } else if (circles.current.includes(s)) {
            const arrPts = [{ x: s.x, y: s.y }, { x: s.x + (s.radius || 0), y: s.y }];
            if (s._id) {
              await updateStrokes(s._id, {
                shape: "circle",
                color: s.color || "black",
                arr: arrPts,
              });
            } else {
              const res = await addstrokes({
                shape: "circle",
                color: s.color || "black",
                arr: arrPts,
                type: "circle",
              });
              if (res?._id) s._id = res._id;
            }
          }
        } catch (err) {
          console.error("save shape error", err);
        }
      }

      if (wasDrawing || wasResizing || wasDragging) saveState(true);
      currentShape.current = null;
      draw();
    };

    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      }
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      window.removeEventListener("keydown", handleKey);
    };
  }, []);

  // ---------------------------
  // clear / selection functions
  // ---------------------------
  const clearOne = () => {
    const sel = lastSelected.current;
    if (!sel) return;
    rectangles.current = rectangles.current.filter((r) => r !== sel);
    circles.current = circles.current.filter((c) => c !== sel);
    penStrokes.current = penStrokes.current.filter((p) => p !== sel);
    lastSelected.current = null;
    saveState(true);
    draw();
  };

  const clearAll = () => {
    rectangles.current = [];
    circles.current = [];
    penStrokes.current = [];
    lastSelected.current = null;
    saveState(true);
    draw();
  };

  // ---------------------------
  // render
  // ---------------------------
  return (
    <div className="flex justify-center items-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair border-2 border-gray-400 rounded-lg bg-white"
      />
    </div>
  );
}
