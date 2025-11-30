"use client";
import { useEffect, useRef, useState } from "react";
import { addStrokeForPage, addstrokes, clearAllStrokes, deleteStroke, getstrokes, getStrokesByPageId, updateStrokes } from "@/app/actions/useractions";
import { io } from "socket.io-client";
import { useSession } from "next-auth/react";

export default function WhiteboardCanvas({ setActiveTool, activeTool, color, stroke, setColor, page }) {
  const canvasRef = useRef(null);
  const { data: session, status } = useSession()
  const ctxRef = useRef(null);

  // shape storage
  const rectangles = useRef([]);
  const circles = useRef([]);
  const penStrokes = useRef([]);
  const [loading, setLoading] = useState(true)

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
  /* Loader UI (Tailwind) */
  function FullscreenLoader({ message = "Loading whiteboard..." }) {
    return (
      <div className="fancy-loader-root" role="status" aria-live="polite" aria-busy="true">
        <div className="loader" aria-hidden="true"></div>
        <div className="sr-only">{message}</div>

        <style jsx>{`
        .fancy-loader-root {
          position: absolute;
          inset: 0;
          z-index: 60;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(6px);
        }

        /* copy of your loader CSS adapted for styled-jsx */
        .loader {
          --w: 10ch;
          font-weight: bold;
          font-family: monospace;
          font-size: 30px;
          letter-spacing: var(--w);
          width: var(--w);
          overflow: hidden;
          white-space: nowrap;
          color: #0000; /* make text transparent, visuals via text-shadow */
          animation: l40 2s infinite;
        }
        .loader:before {
          content: "Loading...";
        }

        @keyframes l40 {
          0%,100% {
           text-shadow:
                calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) 0 #000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
          }
          9% {
           text-shadow:
                calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) 0 #000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
          }
          18% {
           text-shadow:
                calc( 0*var(--w)) 0 #000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
          }
          27% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) 0 #000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
          }
          36% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) 0 #000,calc(-9*var(--w)) 0 #000;
          }
          45% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) 0 #000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) 0 #000;
          }
          54% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) -20px #0000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) 0 #000;
          }
          63% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) 0 #000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) -20px #0000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) -20px #0000;
          }
          72% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) -20px #0000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) -20px #0000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) 0 #000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) -20px #0000;
          }
          81% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) -20px #0000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) 0 #000,calc(-4*var(--w)) -20px #0000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) -20px #0000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) -20px #0000;
          }
          90% {
           text-shadow:
                calc( 0*var(--w)) -20px #0000,calc(-1*var(--w)) -20px #0000,calc(-2*var(--w)) -20px #0000,calc(-3*var(--w)) -20px #0000,calc(-4*var(--w)) -20px #0000,
                calc(-5*var(--w)) -20px #0000,calc(-6*var(--w)) -20px #0000,calc(-7*var(--w)) -20px #0000,calc(-8*var(--w)) -20px #0000,calc(-9*var(--w)) -20px #0000;
          }
        }
      `}</style>
      </div>
    );
  }



  useEffect(() => {
    if (status == "loading") {
      setLoading(true)
    }
    else {
      setLoading(false)
    }

  }, [status])


  // inside WhiteboardCanvas component — add near other useEffects
  useEffect(() => {
    // helper: reliably download a blob or dataURL
    const downloadBlobOrDataUrl = (blobOrDataUrl, filename) => {
      // If string -> dataURL; if Blob -> createObjectURL
      let url;
      let isDataUrl = false;
      if (typeof blobOrDataUrl === "string") {
        url = blobOrDataUrl;
        isDataUrl = true;
      } else {
        url = URL.createObjectURL(blobOrDataUrl);
      }

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      // append and click while still in user-gesture flow (we call this synchronously)
      document.body.appendChild(a);
      a.click();
      a.remove();

      // revoke object URL for Blobs after a short delay so browser has time to start download
      if (!isDataUrl) {
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      }
    };

    // Promise wrapper for canvas.toBlob
    const toBlobPromise = (canvas, type, quality) =>
      new Promise((resolve) => {
        try {
          canvas.toBlob((b) => resolve(b), type, quality);
        } catch (e) {
          // toBlob can throw in rare cases (security / tainted canvas)
          resolve(null);
        }
      });

    // Export image (PNG) — robust with fallback
    const exportImage = async ({ pageId: maybePageId } = {}) => {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn("Export aborted: canvas not ready.");
        return;
      }

      if (!canvas.width || !canvas.height) {
        console.warn("Export aborted: canvas has zero width/height.");
        return;
      }

      try {
        // Use scale if you want higher-res exports
        const scale = 2;
        const off = document.createElement("canvas");
        off.width = Math.max(1, Math.floor(canvas.width * scale));
        off.height = Math.max(1, Math.floor(canvas.height * scale));
        const ctx = off.getContext("2d");

        // white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, off.width, off.height);

        // scale drawing
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        ctx.drawImage(canvas, 0, 0);

        // First try toBlob (async)
        const blob = await toBlobPromise(off, "image/png", 1);
        const id = maybePageId || page?.pageId || "page";
        const name = `whiteboard-${id}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;

        if (blob) {
          downloadBlobOrDataUrl(blob, name);
          return;
        }

        // Fallback: toDataURL (synchronous) — slightly heavier but reliable
        try {
          const dataUrl = off.toDataURL("image/png");
          downloadBlobOrDataUrl(dataUrl, name);
        } catch (err) {
          console.error("Export fallback toDataURL failed:", err);
        }
      } catch (err) {
        console.error("exportImage failed:", err);
      }
    };

    // Export JSON of strokes
    const exportJSON = ({ pageId: maybePageId } = {}) => {
      try {
        const payload = {
          pageId: maybePageId || page?.pageId || null,
          exportedAt: new Date().toISOString(),
          rectangles: (rectangles.current || []).map(r => ({
            x: r.x, y: r.y, width: r.width, height: r.height, color: r.color, size: r.size, _id: r._id || null
          })),
          circles: (circles.current || []).map(c => ({
            x: c.x, y: c.y, radius: c.radius, color: c.color, size: c.size, _id: c._id || null
          })),
          penStrokes: (penStrokes.current || []).map(p => ({
            arr: p.arr || p.points || [],
            color: p.color,
            size: p.size,
            _id: p._id || null
          }))
        };

        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const id = payload.pageId || "page";
        const filename = `whiteboard-${id}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
        downloadBlobOrDataUrl(blob, filename);
      } catch (err) {
        console.error("exportJSON failed:", err);
      }
    };

    // Event listeners for custom events dispatched from TopBar/Menubar
    const handleExportImage = (e) => {
      // try to do the download immediately (so browser sees it as user-initiated)
      exportImage({ pageId: e?.detail?.pageId });
    };
    const handleExportJSON = (e) => {
      exportJSON({ pageId: e?.detail?.pageId });
    };

    window.addEventListener("export-image", handleExportImage);
    window.addEventListener("export-json", handleExportJSON);

    return () => {
      window.removeEventListener("export-image", handleExportImage);
      window.removeEventListener("export-json", handleExportJSON);
    };
  }, [canvasRef, page?.pageId /* include page?.pageId if used */]);

  useEffect(() => {
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
    if (activeTool == "pen") {
      setColor("black")
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

  // --- no-op local persistence (keeps other code calling these safe) ---
  const persistHistoryToLocal = () => {
    // intentionally left blank — history is in-memory only now
  };

  const restoreHistoryFromLocal = () => {
    // intentionally return false to indicate no local history present
    return false;
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
    // no local persistence
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
    // no local persistence
  };

  const restoreNode = (nodeId) => {
    const node = nodesMap.current[nodeId];
    if (!node || !node.snapshot) return;
    rectangles.current = JSON.parse(JSON.stringify(node.snapshot.rectangles || []));
    circles.current = JSON.parse(JSON.stringify(node.snapshot.circles || []));
    penStrokes.current = JSON.parse(JSON.stringify(node.snapshot.penStrokes || []));
    currentNodeId.current = nodeId;
    draw();
    // no local persistence
  };

  function findRemoved(prev, next) {
    const prevAll = [
      ...(prev.rectangles || []),
      ...(prev.circles || []),
      ...(prev.penStrokes || [])
    ];

    const nextAll = [
      ...(next.rectangles || []),
      ...(next.circles || []),
      ...(next.penStrokes || [])
    ];

    // Find a shape that existed before but not after
    const removed = prevAll.find(
      p => !nextAll.some(n => n === p || (n._id && p._id && n._id === p._id))
    );

    return removed || null;
  }
  function findAdded(prev, next) {
    const prevAll = [
      ...(prev.rectangles || []),
      ...(prev.circles || []),
      ...(prev.penStrokes || [])
    ];

    const nextAll = [
      ...(next.rectangles || []),
      ...(next.circles || []),
      ...(next.penStrokes || [])
    ];

    // Find a shape that appears in next but not before
    const added = nextAll.find(
      n => !prevAll.some(p => p === n || (p._id && n._id && p._id === n._id))
    );

    return added || null;
  }

  function shallowShapeEquals(a, b) {
    if (!a || !b) return false;
    // Compare relevant fields for shapes
    const ka = {
      x: a.x, y: a.y, width: a.width, height: a.height, radius: a.radius,
      color: a.color, size: a.size,
      arr: Array.isArray(a.arr) ? a.arr : (Array.isArray(a.points) ? a.points : []),
    };
    const kb = {
      x: b.x, y: b.y, width: b.width, height: b.height, radius: b.radius,
      color: b.color, size: b.size,
      arr: Array.isArray(b.arr) ? b.arr : (Array.isArray(b.points) ? b.points : []),
    };
    try {
      return JSON.stringify(ka) === JSON.stringify(kb);
    } catch (e) {
      return false;
    }
  }

  /**
   * Returns array of { prevShape, nextShape } where same _id but changed
   */
  function findUpdated(prev, next) {
    const prevAll = [
      ...(prev.rectangles || []),
      ...(prev.circles || []),
      ...(prev.penStrokes || [])
    ];
    const nextAll = [
      ...(next.rectangles || []),
      ...(next.circles || []),
      ...(next.penStrokes || [])
    ];

    const prevById = new Map(prevAll.filter(s => s && s._id).map(s => [String(s._id), s]));
    const updated = [];

    for (const n of nextAll) {
      if (!n || !n._id) continue;
      const id = String(n._id);
      const p = prevById.get(id);
      if (p && !shallowShapeEquals(p, n)) {
        updated.push({ prev: p, next: n });
      }
    }
    return updated;
  }


  const undo = async () => {
    const cur = nodesMap.current[currentNodeId.current];
    if (!cur) return;
    const parentId = cur.parentId;
    if (!parentId) return;

    // snapshot before undo
    const prev = makeSnapshot();

    // restore target snapshot (after undo)
    restoreNode(parentId);

    // snapshot after undo
    const next = makeSnapshot();

    // FIND REMOVED SHAPE
    const removed = findRemoved(prev, next);

    // DELETE ONLY THAT SHAPE IN DB
    if (removed && removed._id) {
      try {
        await deleteStroke(removed._id);
      } catch (e) {
        console.log("Failed to delete from DB:", e);
      }
    }

    // FIND UPDATED SHAPES (moved / resized / color / size changes)
    const updatedPairs = findUpdated(prev, next);
    for (const { next: nextShape } of updatedPairs) {
      if (!nextShape || !nextShape._id) continue;
      const payload = {};
      // shape type
      if (typeof nextShape.radius === "number") {
        payload.shape = "circle";
        payload.points = [{ x: nextShape.x, y: nextShape.y }, { x: nextShape.x + (nextShape.radius || 0), y: nextShape.y }];
        payload.radius = nextShape.radius;
      } else if (typeof nextShape.width === "number" || typeof nextShape.height === "number") {
        payload.shape = "rectangle";
        payload.points = [{ x: nextShape.x, y: nextShape.y }];
        payload.width = nextShape.width;
        payload.height = nextShape.height;
      } else {
        payload.shape = "pen";
        payload.points = nextShape.arr || nextShape.points || [];
      }
      if (typeof nextShape.color !== "undefined") payload.color = nextShape.color;
      if (typeof nextShape.size !== "undefined") payload.size = nextShape.size;

      try {
        await updateStrokes(String(nextShape._id), payload);
      } catch (e) {
        console.warn("updateStrokes failed (undo) for", nextShape._id, e);
      }
    }

    // BROADCAST UNDO
    try {
      socketRef.current?.emit("undo", {
        sourceClient: localClientId.current,
        snapshot: next,
        pageId: page.pageId,
      });
    } catch (e) {
      console.warn("undo emit failed", e);
    }
  };

  const redo = async () => {
    const cur = nodesMap.current[currentNodeId.current];
    if (!cur) return;

    const childId = cur.childrenIds?.[cur.childrenIds.length - 1];
    if (!childId) return;

    // snapshot before redo
    const prev = makeSnapshot();

    // apply redo locally
    restoreNode(childId);

    // snapshot after redo
    const next = makeSnapshot();

    // find the shape that was added back
    const added = findAdded(prev, next);

    // if redo added a shape back → save to DB (only if no _id)
    if (added && !added._id) {
      try {
        const saved = await saveShapeToDB(added);
        if (saved?._id) {
          // attach ID to local shape so future updates/deletes work
          added._id = saved._id;
        }
      } catch (e) {
        console.log("Failed to add shape back to DB:", e);
      }
    }

    // FIND UPDATED SHAPES (moved/resized that reappear with changed props)
    const updatedPairs = findUpdated(prev, next);
    for (const { next: nextShape } of updatedPairs) {
      if (!nextShape || !nextShape._id) continue;
      const payload = {};
      if (typeof nextShape.radius === "number") {
        payload.shape = "circle";
        payload.points = [{ x: nextShape.x, y: nextShape.y }, { x: nextShape.x + (nextShape.radius || 0), y: nextShape.y }];
        payload.radius = nextShape.radius;
      } else if (typeof nextShape.width === "number" || typeof nextShape.height === "number") {
        payload.shape = "rectangle";
        payload.points = [{ x: nextShape.x, y: nextShape.y }];
        payload.width = nextShape.width;
        payload.height = nextShape.height;
      } else {
        payload.shape = "pen";
        payload.points = nextShape.arr || nextShape.points || [];
      }
      if (typeof nextShape.color !== "undefined") payload.color = nextShape.color;
      if (typeof nextShape.size !== "undefined") payload.size = nextShape.size;

      try {
        await updateStrokes(String(nextShape._id), payload);
      } catch (e) {
        console.warn("updateStrokes failed (redo) for", nextShape._id, e);
      }
    }

    // broadcast redo to others
    try {
      socketRef.current?.emit("redo", {
        sourceClient: localClientId.current,
        snapshot: next,
        pageId: page.pageId
      });
    } catch (e) {
      console.warn("redo emit failed", e);
    }
  };

  async function saveShapeToDB(s) {
    if (!s) return null;

    // Pen
    if (s.arr) {
      return await addStrokeForPage({
        pageId: page.pageId,
        shape: "pen",
        color: s.color,
        size: s.size,
        arr: s.arr
      });
    }

    // Rectangle
    if (typeof s.width === "number" && typeof s.height === "number") {
      return await addStrokeForPage({
        pageId: page.pageId,
        shape: "rectangle",
        color: s.color,
        size: s.size,
        arr: [{ x: s.x, y: s.y }],
        width: s.width,
        height: s.height
      });
    }

    // Circle
    if (typeof s.radius === "number") {
      return await addStrokeForPage({
        pageId: page.pageId,
        shape: "circle",
        color: s.color,
        size: s.size,
        arr: [
          { x: s.x, y: s.y },
          { x: s.x + s.radius, y: s.y }
        ],
        radius: s.radius
      });
    }

    return null;
  }




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
  // --- Updated useEffect Code ---
  useEffect(() => {
    if (!page) {
      return
    }
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    const resizeCanvas = () => {
      canvas.width = Math.floor(window.innerWidth * 0.9);
      canvas.height = Math.floor(window.innerHeight * 0.8);
      draw();
    };

    // ✅ FIX 1: Set initial dimensions (e.g., 800x600) before client-side resize
    // This ensures the initial DOM rendered by the server matches the first client render.
    canvas.width = 800;
    canvas.height = 600;

    resizeCanvas(); // Now runs after the initial fixed size is set (first client side render)

    window.addEventListener("resize", resizeCanvas);

    // ... rest of the code is unchanged ...
    rectangles.current = []
    circles.current = []
    penStrokes.current = []
    // initHistory()

    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001", {
      transports: ["websocket"],
      // optionally senFsoctrefd auth user id:
      // auth: { userId: currentUserId || null }
    });
    socketRef.current.on("stroke:created", (stroke) => {
      if (stroke.pageId !== page.pageId) {
        return
      }
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
      if (stroke.pageId !== page.pageId) {
        return
      }
      try {
        // ignore our own broadcasts
        if (stroke.sourceClient === localClientId.current) return;

        // normalise incoming points (support older 'arr' too)
        const pts = stroke.points || stroke.arr || [];

        // rectangles
        const r = rectangles.current.find(x => x._id === stroke._id);
        if (r) {
          r.x = pts[0]?.x ?? r.x;
          r.y = pts[0]?.y ?? r.y;
          r.width = stroke.width ?? r.width;
          r.height = stroke.height ?? r.height;
          // keep optional stored points too
          r.points = pts.length ? pts : r.points;
          saveState(false);
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
    socketRef.current.on("undo", ({ sourceClient, snapshot, pageId }) => {
      if (pageId !== page.pageId) {
        return
      }
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

    socketRef.current.on("redo", ({ sourceClient, snapshot, pageId }) => {
      if (pageId !== page.pageId) {
        return
      }
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
        const points = await getStrokesByPageId((page ? page.pageId : 0));
        // console.log(points)
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
            // console.log(stroke,rectangles,circles,penStrokes)
          });
        }
      } catch (err) {
        console.error("load strokes error", err);
      } finally {
        // const restored = restoreHistoryFromLocal();
        // if (restored && currentNodeId.current) {
        //   restoreNode(currentNodeId.current);
        // } else {
        //   const initialSnap = makeSnapshot();
        //   initHistory(initialSnap);
        //   draw();
        // }
        const initialSnap = makeSnapshot();
        initHistory(initialSnap);
        draw();

      }
      // console.log(rectangles,circles,penStrokes)
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
            const res = await addStrokeForPage({
              pageId: page.pageId,
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
      if (lastSelected.current) {
        const s = lastSelected.current;
        // console.log(s,"sss")
        try {
          if (rectangles.current.includes(s)) {
            if (s._id) {
              const updated = await updateStrokes(s._id, {
                pageId: page.pageId,
                shape: "rectangle",
                color: s.color || "black",
                points: [{ x: s.x, y: s.y }],   // <-- match backend field (points or arr)
                width: s.width,
                height: s.height,
                type: "rectangle",
              });
              socketRef.current?.emit("stroke:updated", { ...(updated || { _id: s._id }), sourceClient: localClientId.current });

            } else {

              const res = await addStrokeForPage({
                pageId: page.pageId,
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
            const arrPts = [{ x: s.x, y: s.y }, { x: s.x + (s.radius || 0), y: s.y }];
            if (s._id) {
              const updated = await updateStrokes(s._id, {
                pageId: page.pageId,
                shape: "circle",
                color: s.color || "black",
                points: arrPts,
                radius: s.radius,
                type: "circle",
              });
              socketRef.current?.emit("stroke:updated", { ...(updated || { _id: s._id }), sourceClient: localClientId.current });

            } else {

              const res = await addStrokeForPage({
                pageId: page.pageId,
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
  }, [page]);

  // ---------------------------
  // clear / selection functions
  // ---------------------------
  const clearOne = async () => {
    const sel = lastSelected.current;
    if (!sel) return;
    rectangles.current = rectangles.current.filter((r) => r !== sel);
    circles.current = circles.current.filter((c) => c !== sel);
    penStrokes.current = penStrokes.current.filter((p) => p !== sel);
    lastSelected.current = null;
    // console.log(sel,"sel")
    await deleteStroke(sel._id)
    saveState(true);
    draw();
    if (sel._id) {
      socketRef.current?.emit("stroke:deleted", { _id: sel._id, sourceClient: localClientId.current });
    }
  };

  const clearAll = async () => {
    rectangles.current = [];
    circles.current = [];
    penStrokes.current = [];
    lastSelected.current = null;
    // re-init history root so undo does nothing until user draws again
    initHistory(makeSnapshot());
    draw();
    await clearAllStrokes(page.pageId)
    // broadcast to other clients
    socketRef.current?.emit("clear:all", { sourceClient: localClientId.current });
  };


  // ---------------------------
  // render
  // ---------------------------
  return (
    <div className="relative flex justify-center items-center w-full h-full">

      {/* 🌑 Ambient Dark Theme - "No Page Selected" Card */}
      {page === null && (
        <div
          className="
      w-full h-full p-16 
      flex flex-col items-center justify-center 
      // 🎨 ADJUSTMENT: Deep Charcoal Background with Subtle Gradient
      bg-gray-900 
      relative overflow-hidden 
      text-slate-100
    "
          style={{
            // Add a subtle, dark radial gradient for depth and ambience
            backgroundImage: 'radial-gradient(at 50% 10%, #374151 0%, transparent 70%)',
          }}
        >
          {/* Background Pattern - Deep Dark tone, higher opacity since background is dark */}
          <div
            className="absolute inset-0 bg-repeat opacity-10"
            style={{
              // Using a dark gray for the grid pattern on a dark background
              backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'6\' height=\'6\' viewBox=\'0 0 6 6\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'%234b5563\' fill-opacity=\'0.8\' fill-rule=\'evenodd\'%3E%3Cpath d=\'M0 0h3v3H0V0zm3 3h3v3H3V3z\'/%3E%3C/g%3E%3C/svg%3E")'
            }}
          ></div>

          {/* Main Floating Card Container - Optimized for Dark Ambience */}
          <div
            className="
        relative z-10 
        max-w-xl w-full p-10 
        flex flex-col items-center 
        // 🎨 ADJUSTMENT: Pure Glass effect with light border
        backdrop-blur-xl bg-white/5 
        rounded-3xl 
        shadow-2xl 
        border border-gray-700/60
        transform transition duration-700 ease-in-out 
        hover:scale-[1.01] hover:shadow-3xl-glow 
        text-center
      "
            style={{
              // Using a cool, bright blue glow for contrast against the dark background
              '--tw-shadow-3xl-glow': '0 25px 50px -12px rgba(0, 0, 0, 0.4), 0 0 45px rgba(2, 132, 199, 0.8)', // Sky-600 glow
            }}
          >

            {/* Icon Placeholder - Bright, contrasting Sky Blue */}
            <div className="mb-6 p-5 rounded-full bg-sky-600/20 border-2 border-sky-400 animate-bounce-slow">
              <svg
                className="w-16 h-16 text-sky-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.5"
                  d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            {/* Hero Title - Pure White for high contrast */}
            <h2
              className="
          text-5xl font-black mb-3 tracking-tighter 
          text-white 
          drop-shadow-lg
        "
            >
              A Blank Slate.
            </h2>

            {/* Core Message with Emphasis - Light text for readability */}
            <p
              className="
          text-xl text-slate-300 
          max-w-md mb-8 leading-relaxed
        "
            >
              Your content area is empty. Create or select a page using the sidebar to the left to start adding your data.
              <br />
              <span className="font-bold text-sky-400">Let's build something great!</span>
            </p>

            {/* Subtle Hint/Footer - Muted background */}
            <div
              className="
          text-sm font-mono 
          text-gray-400 
          p-2 rounded-lg 
          bg-gray-700/50 
        "
            >
              Status: **Awaiting Input**
            </div>

          </div>
        </div>
      )}

      {/* 🎨 Normal Canvas Rendering */}
      {page !== null && (
        <>
          <canvas
            ref={canvasRef}
            className="cursor-crosshair border-2 border-gray-400 rounded-lg bg-white"
          />

          {loading && <FullscreenLoader message="Loading whiteboard..." />}
        </>
      )}

    </div>

  );

}
