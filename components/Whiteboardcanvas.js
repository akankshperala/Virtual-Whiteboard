"use client";
import { useEffect, useRef } from "react";
import { addstrokes, getstrokes, updateStrokes } from "@/app/actions/useractions";
import { io } from "socket.io-client";

export default function WhiteboardCanvas({ setActiveTool, activeTool, color, stroke }) {
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
  const socketRef = useRef(null);
  const localClientId = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);



  useEffect(() => {
    console.log(activeTool)
    if (activeTool == "clearone") {
      clearOne()
      setActiveTool("pen")
    }
    if (activeTool == "clearall") {
      clearAll()
      setActiveTool("pen")
    }
    if (activeTool == "undo") {
      undo();
      setActiveTool("pen");
    }

    if (activeTool == "redo") {
      redo();
      setActiveTool("pen");
    }

    currentProps.current = { activeTool, color, stroke };

  }, [activeTool, color, stroke]);

  const handleRadius = 6;

  // ---------------------------
  // Helpers: history tree utils
  // ---------------------------
  const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

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

    // If socket exists, broadcast (guards avoid errors)
    try {
      if (socketRef.current) {
        socketRef.current.emit("undo", {
          sourceClient: localClientId.current,
          snapshot: makeSnapshot(),
        });
      }
    } catch (e) { console.warn("undo emit failed", e); }
  };

  const redo = () => {
    const cur = nodesMap.current[currentNodeId.current];
    if (!cur) return;
    const childId = cur.childrenIds?.[cur.childrenIds.length - 1];
    if (!childId) return;
    restoreNode(childId);

    try {
      if (socketRef.current) {
        socketRef.current.emit("redo", {
          sourceClient: localClientId.current,
          snapshot: makeSnapshot(),
        });
      }
    } catch (e) { console.warn("redo emit failed", e); }
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

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket"],
      // optionally send auth user id:
      // auth: { userId: currentUserId || null }
    });
    socketRef.current.on("stroke:created", (stroke) => {
      try {
        if (!stroke) return;
        if (stroke.sourceClient === localClientId.current) return; // ignore our own broadcast

        // dedupe by _id
        if (stroke._id && (penStrokes.current.find(s => s._id === stroke._id) || rectangles.current.find(r => r._id === stroke._id) || circles.current.find(c => c._id === stroke._id))) {
          return;
        }

        if (stroke.shape === "rectangle") {
          rectangles.current.push({
            x: stroke.points?.[0]?.x ?? 0,
            y: stroke.points?.[0]?.y ?? 0,
            width: stroke.width || 0,
            height: stroke.height || 0,
            _id: stroke._id,
            color: stroke.color,
            size: stroke.size,
          });
        } else if (stroke.shape === "circle") {
          console.log(stroke, "strpok")
          circles.current.push({
            x: stroke.points?.[0]?.x ?? 0,
            y: stroke.points?.[0]?.y ?? 0,
            radius: stroke.radius || 0,
            _id: stroke._id,
            color: stroke.color,
            size: stroke.size,
          });
        } else {
          penStrokes.current.push({
            arr: stroke.points || [],
            _id: stroke._id,
            color: stroke.color,
            size: stroke.size,
          });
        }

        // update local history if you want remote changes to be undoable locally:
        saveState(false);
        draw();
      } catch (e) { console.error(e); }
    });

    socketRef.current.on("stroke:updated", (stroke) => {
      try {
        // ignore our own broadcasts
        console.log(4)
        if (stroke.sourceClient === localClientId.current) return;

        // normalise incoming points (support older 'arr' too)
        const pts = stroke.points || stroke.arr || [];

        // rectangles
        const r = rectangles.current.find(x => x._id === stroke._id);
        console.log(r, "r")
        console.log(stroke)
        if (r) {
          r.x = pts[0]?.x ?? r.x;
          r.y = pts[0]?.y ?? r.y;
          r.width = stroke.width ?? r.width;
          r.height = stroke.height ?? r.height;
          // keep optional stored points too
          r.points = pts.length ? pts : r.points;
          saveState(false);
          console.log(r)
          draw();
          return;
        }

        // circles
        const c = circles.current.find(x => x._id === stroke._id);
        if (c) {
          c.x = pts[0]?.x ?? c.x;
          c.y = pts[0]?.y ?? c.y;
          // compute radius from pts if server didn't send radius
          c.radius = stroke.radius ?? (pts[1] ? Math.hypot(pts[1].x - (pts[0]?.x ?? c.x), pts[1].y - (pts[0]?.y ?? c.y)) : c.radius);
          c.points = pts.length ? pts : c.points;
          saveState(false);
          // console.log(c)
          draw();
          return;
        }

        // pen strokes (freehand)
        const p = penStrokes.current.find(x => x._id === stroke._id);
        if (p) {
          p.arr = pts.length ? pts : p.arr || []; // keep using p.arr in drawing code
          saveState(false);
          draw();
          return;
        }

      } catch (e) {
        console.error("socket stroke:updated handler error", e);
      }
    });

    socketRef.current.on("stroke:deleted", ({ _id, sourceClient }) => {
      if (sourceClient === localClientId.current) return;
      rectangles.current = rectangles.current.filter(r => r._id !== _id);
      circles.current = circles.current.filter(c => c._id !== _id);
      penStrokes.current = penStrokes.current.filter(p => p._id !== _id);
      saveState(false);
      draw();
    });

    // Receive UNDO from another user
    socketRef.current.on("undo", ({ sourceClient, snapshot }) => {
      // console.error(0)
      if (sourceClient === localClientId.current) return;

      // overwrite shapes
      rectangles.current = snapshot.rectangles || [];
      circles.current = snapshot.circles || [];
      penStrokes.current = snapshot.penStrokes || [];

      // reset history so undo works cleanly again
      initHistory(snapshot);

      draw();
    });

    socketRef.current.on("redo", ({ sourceClient, snapshot }) => {
      if (sourceClient === localClientId.current) return;

      rectangles.current = snapshot.rectangles || [];
      circles.current = snapshot.circles || [];
      penStrokes.current = snapshot.penStrokes || [];

      initHistory(snapshot);

      draw();
    });


    socketRef.current.on("clear:all", ({ sourceClient }) => {

      if (sourceClient === localClientId.current) return;
      rectangles.current = []; circles.current = []; penStrokes.current = [];
      // reinit history root to current empty state so undo does nothing
      initHistory(makeSnapshot());
      draw();
    });

    // restore strokes from backend
    (async () => {
      try {
        const points = await getstrokes();
        console.log(points)
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
            console.log(stroke,rectangles,circles,penStrokes)
          });
        }
      } catch (err) {
        console.error("load strokes error", err);
      } finally {
        // prefer server-authoritative snapshot on every fresh page load
        // prefer restoring local undo/redo history if present, otherwise init from server snapshot
        const restored = restoreHistoryFromLocal();
        if (restored && currentNodeId.current) {
          // restore to the node the user had last
          restoreNode(currentNodeId.current);
        } else {
          const initialSnap = makeSnapshot();
          initHistory(initialSnap);
          draw();
        }


      }
      console.log(rectangles,circles,penStrokes)
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
      // console.log("hi")
      if (wasDrawing) {
        const cur = penStrokes.current[penStrokes.current.length - 1];
        const points = cur?.arr || [];
        if (points.length > 0) {
          try {
            // console.log(77777777777)
            const res = await addstrokes({
              shape: "pen",
              color: cur.color,
              size: cur.size,
              arr: points,
            });
            if (res?._id) {
              cur._id = res._id;
              socketRef.current?.emit("stroke:created", { ...res, sourceClient: localClientId.current });
            }
          } catch (err) {
            console.error("save pen error", err);
          }
        }
      }
      console.log(lastSelected.current, "oloko")
      if (lastSelected.current) {
        const s = lastSelected.current;
        // console.log(s,"sss")
        try {
          if (rectangles.current.includes(s)) {
            if (s._id) {
              const updated = await updateStrokes(s._id, {
                shape: "rectangle",
                color: s.color || "black",
                points: [{ x: s.x, y: s.y }],   // <-- match backend field (points or arr)
                width: s.width,
                height: s.height,
                type: "rectangle",
              });
              socketRef.current?.emit("stroke:updated", { ...(updated || { _id: s._id }), sourceClient: localClientId.current });

            } else {

              const res = await addstrokes({
                shape: "rectangle",
                color: s.color || "black",
                arr: [{ x: s.x, y: s.y }],
                width: s.width,
                height: s.height,
                type: "rectangle",
              });
              if (res?._id) {
                s._id = res._id;
                socketRef.current?.emit("stroke:created", { ...res, sourceClient: localClientId.current });
              }
            }
          } else if (circles.current.includes(s)) {
            console.log(s, "sss")
            const arrPts = [{ x: s.x, y: s.y }, { x: s.x + (s.radius || 0), y: s.y }];
            if (s._id) {
              const updated = await updateStrokes(s._id, {
                shape: "circle",
                color: s.color || "black",
                points: arrPts,
                radius: s.radius,
                type: "circle",
              });
              socketRef.current?.emit("stroke:updated", { ...(updated || { _id: s._id }), sourceClient: localClientId.current });

            } else {

              const res = await addstrokes({
                shape: "circle",
                color: s.color || "black",
                arr: arrPts,
                type: "circle",
                radius: s.radius
              });
              // console.log(s,res,"kmkkl")
              if (res?._id) {
                s._id = res._id;
                socketRef.current?.emit("stroke:created", { ...res, sourceClient: localClientId.current });
              }
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
      // cleanup at end of useEffect
      if (socketRef.current) {
        socketRef.current.off("stroke:created");
        socketRef.current.off("stroke:updated");
        socketRef.current.off("stroke:deleted");
        socketRef.current.off("clear:all");
        socketRef.current.disconnect();
        socketRef.current = null;
      }

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
    if (sel._id) {
      socketRef.current?.emit("stroke:deleted", { _id: sel._id, sourceClient: localClientId.current });
    }
  };

  const clearAll = () => {
    rectangles.current = [];
    circles.current = [];
    penStrokes.current = [];
    lastSelected.current = null;
    // re-init history root so undo does nothing until user draws again
    initHistory(makeSnapshot());
    draw();
    // broadcast to other clients
    socketRef.current?.emit("clear:all", { sourceClient: localClientId.current });
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
