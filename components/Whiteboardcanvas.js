"use client";
import {
  addstrokes,
  getstrokes,
  updateStrokes,
} from "@/app/actions/useractions";
import { useRef, useEffect } from "react";

export default function WhiteboardCanvas({
  activeTool,
  color,
  stroke,
  iserasing,
  clearTrigger,
}) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);

  const rectangles = useRef([]);
  const circles = useRef([]);
  const penStrokes = useRef([]);
  const currentShape = useRef(null);

  const isDrawing = useRef(false);
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const currentProps = useRef({ activeTool, color, stroke });

  const handleRadius = 6;
  useEffect(() => {
    currentProps.current = { activeTool, color, stroke };
  }, [activeTool, color, stroke]);
  useEffect(() => {
    console.log("rect", rectangles);
    console.log("circ", circles);
    console.log("pen", penStrokes);
  });

  // --- Helper Functions ---
  const pointInsideRect = (x, y, rect) =>
    x >= rect.x &&
    x <= rect.x + rect.width &&
    y >= rect.y &&
    y <= rect.y + rect.height;

  const pointInsideRectHandle = (x, y, rect) => {
    const hx = rect.x + rect.width;
    const hy = rect.y + rect.height;
    const dx = x - hx;
    const dy = y - hy;
    return dx * dx + dy * dy <= handleRadius * handleRadius;
  };

  const pointInCircle = (x, y, circle) => {
    const dx = x - circle.x;
    const dy = y - circle.y;
    return dx * dx + dy * dy <= circle.radius * circle.radius;
  };

  const pointInCircleHandle = (x, y, circle) => {
    const hx = circle.x + circle.radius;
    const hy = circle.y;
    const dx = x - hx;
    const dy = y - hy;
    return dx * dx + dy * dy <= handleRadius * handleRadius;
  };

  // --- Draw function ---
  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw pen strokes
    penStrokes.current.forEach((stroke) => {
      const points = Array.isArray(stroke)
        ? stroke
        : Array.isArray(stroke.arr)
        ? stroke.arr
        : null;
      if (!points) return;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      points.forEach((p) => {
        if (p && p.x != null && p.y != null) ctx.lineTo(p.x, p.y);
      });
      console.log(stroke);

      ctx.strokeStyle = stroke.color || currentProps.current.color || "black";
      ctx.lineWidth = stroke.size || currentProps.current.stroke || 2;
      ctx.stroke();
    });

    // Draw rectangles
    rectangles.current.forEach((rect) => {
      // console.log(rect)
      if (!rect) return;
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

      if (currentShape.current === rect) {
        ctx.strokeStyle = rect.color || "#0077ff";
        ctx.lineWidth = rect.size || 2;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

        ctx.beginPath();
        ctx.arc(
          rect.x + rect.width,
          rect.y + rect.height,
          handleRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "#0077ff";
        ctx.fill();
      }
    });

    // Draw circles
    circles.current.forEach((circle) => {
      if (!circle) return;
      ctx.beginPath();
      ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();
      ctx.strokeStyle = "black";
      ctx.lineWidth = circle.size || 2;
      ctx.stroke();

      if (currentShape.current === circle) {
        ctx.strokeStyle = circle.style || "#0077ff";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(
          circle.x + circle.radius,
          circle.y,
          handleRadius,
          0,
          Math.PI * 2
        );
        ctx.fillStyle = "#0077ff";
        ctx.fill();
      }
    });
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    canvas.width = window.innerWidth * 0.9;
    canvas.height = window.innerHeight * 0.8;

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load strokes from backend
    const loadStrokes = async () => {
      try {
        const points = await getstrokes();
        console.log(points);
        if (!points || !Array.isArray(points)) return;
        points.forEach((stroke) => {
          if (
            !stroke ||
            !Array.isArray(stroke.points) ||
            stroke.points.length === 0
          )
            return;
          const pts = stroke.points.filter(
            (p) => p && typeof p.x === "number" && typeof p.y === "number"
          );
          if (pts.length === 0) return;
          const first = pts[0];
          console.log(stroke, "strokes");
          if (stroke.shape === "rectangle") {
            const rect = {
              x: first.x,
              y: first.y,
              width: stroke.width,
              height: stroke.height,
              _id: stroke._id,
            };
            rectangles.current.push(rect);
          } else if (stroke.shape === "circle") {
            circles.current.push({
              x: first.x,
              y: first.y,
              size: stroke.size,

              radius: pts[1]
                ? Math.hypot(pts[1].x - first.x, pts[1].y - first.y)
                : 50,
              _id: stroke._id,
            });
          } else {
            penStrokes.current.push({
              arr: pts,
              _id: stroke._id,
              color: stroke.color,
              size: stroke.size,
            });
          }
        });

        draw();
      } catch (err) {
        console.error(err);
      }
    };
    loadStrokes();
    console.log("rect", rectangles);
    console.log("circ", circles);
    console.log("pen", penStrokes);
    // --- EVENTS ---
    const handleMouseDown = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Resize handles
      const rectHandle = rectangles.current.find((r) =>
        pointInsideRectHandle(x, y, r)
      );
      const circHandle = circles.current.find((c) =>
        pointInCircleHandle(x, y, c)
      );
      if (rectHandle) {
        currentShape.current = rectHandle;
        isResizing.current = true;
        return;
      }
      if (circHandle) {
        currentShape.current = circHandle;
        isResizing.current = true;
        return;
      }

      // Drag check
      const rectShape = rectangles.current.find((r) =>
        pointInsideRect(x, y, r)
      );
      const circShape = circles.current.find((c) => pointInCircle(x, y, c));
      if (rectShape) {
        currentShape.current = rectShape;
        isDragging.current = true;
        dragOffset.current = { x: x - rectShape.x, y: y - rectShape.y };
        return;
      }
      if (circShape) {
        currentShape.current = circShape;
        isDragging.current = true;
        dragOffset.current = { x: x - circShape.x, y: y - circShape.y };
        return;
      }

      // New shapes or pen
      if (currentProps.current.activeTool === "rectangle") {
        const newRect = { x, y, width: 0, height: 0 };
        rectangles.current.push(newRect);
        currentShape.current = newRect;
        isResizing.current = true;
      } else if (currentProps.current.activeTool === "circle") {
        const newCircle = { x, y, radius: 0 };
        circles.current.push(newCircle);
        currentShape.current = newCircle;
        isResizing.current = true;
      } else {
        isDrawing.current = true;
        penStrokes.current.push({
          arr: [{ x, y }],
          color: currentProps.current.color, // store color immediately
          size: currentProps.current.stroke, // store thickness
          _id: null,
        });
      }

      draw();
    };

    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // --- Pen drawing ---
      if (
        isDrawing.current &&
        currentProps.current.activeTool !== "rectangle" &&
        currentProps.current.activeTool !== "circle"
      ) {
        const currentStroke = penStrokes.current[penStrokes.current.length - 1];
        const strokePoints = Array.isArray(currentStroke)
          ? currentStroke
          : currentStroke.arr;
        strokePoints.push({ x, y });
        draw();
        return;
      }

      // Hover detection
      if (!isDragging.current && !isResizing.current) {
        const hoverRect = rectangles.current.find((r) =>
          pointInsideRect(x, y, r)
        );
        const hoverCirc = circles.current.find((c) => pointInCircle(x, y, c));
        currentShape.current = hoverRect || hoverCirc || null;
      }

      // Resizing
      if (isResizing.current && currentShape.current) {
        if (rectangles.current.includes(currentShape.current)) {
          currentShape.current.width = x - currentShape.current.x;
          currentShape.current.height = y - currentShape.current.y;
        } else if (circles.current.includes(currentShape.current)) {
          currentShape.current.radius = Math.max(
            Math.hypot(x - currentShape.current.x, y - currentShape.current.y),
            10
          );
        }
      }

      // Dragging
      if (isDragging.current && currentShape.current) {
        if (rectangles.current.includes(currentShape.current)) {
          currentShape.current.x = x - dragOffset.current.x;
          currentShape.current.y = y - dragOffset.current.y;
        } else if (circles.current.includes(currentShape.current)) {
          currentShape.current.x = x - dragOffset.current.x;
          currentShape.current.y = y - dragOffset.current.y;
        }
      }

      draw();
    };

    const handleMouseUp = async () => {
      const wasDrawing = isDrawing.current;
      isDrawing.current = false;
      isDragging.current = false;
      isResizing.current = false;

      // Save pen strokes
      if (wasDrawing) {
        const currentStroke = penStrokes.current[penStrokes.current.length - 1];
        const strokePoints = Array.isArray(currentStroke)
          ? currentStroke
          : currentStroke.arr;
        if (strokePoints.length > 0) {
          try {
            const res = await addstrokes({
              shape: "pen",
              color: currentProps.current.color,
              size: currentProps.current.stroke,
              arr: strokePoints,
            });
            // console.log(res,"ressss")
            // penStrokes.current[penStrokes.current.length - 1]=res
            if (res?._id) {
              if (Array.isArray(currentStroke)) currentStroke._id = res._id;
              else currentStroke._id = res._id;
            }
          } catch (err) {
            console.error("Error saving pen stroke:", err);
          }
        }
      }

      // Save rectangles/circles
      if (currentShape.current) {
        const s = currentShape.current;
        let points = [];
        let shapeType = currentProps.current.activeTool;
        console.log(s);

        if (rectangles.current.includes(s)) {
          console.log(rectangles);
          // points = [
          //   { x: s.x, y: s.y },
          //   { x: s.x + s.width, y: s.y },
          //   { x: s.x + s.width, y: s.y + s.height },
          //   { x: s.x, y: s.y + s.height },
          //   { x: s.x, y: s.y },
          // ];
          shapeType = "rectangle";
          try {
            if (s._id) {
              await updateStrokes(s._id, {
                shape: shapeType,
                color: "black",
                arr: [{ x: s.x, y: s.y }],
                width: s.width,
                height: s.height,
                type: shapeType,
              });
            } else {
              const res = await addstrokes({
                shape: shapeType,
                color: "black",
                arr: [{ x: s.x, y: s.y }],
                width: s.width,
                height: s.height,
                type: shapeType,
              });
              if (res?._id) s._id = res._id;
            }
          } catch (err) {
            console.error("Error saving shape:", err);
          }
        } else if (circles.current.includes(s)) {
          points = [
            { x: s.x, y: s.y },
            { x: s.x + s.radius, y: s.y },
          ];
          shapeType = "circle";
          if (points.length > 0) {
            try {
              if (s._id) {
                await updateStrokes(s._id, {
                  shape: shapeType,
                  color: "black",
                  arr: points,
                });
              } else {
                const res = await addstrokes({
                  shape: shapeType,
                  color: "black",
                  arr: points,
                  type: shapeType,
                });
                if (res?._id) s._id = res._id;
              }
            } catch (err) {
              console.error("Error saving shape:", err);
            }
          }
        }
      }

      currentShape.current = null;
      draw();
    };

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair border-2 border-gray-400 rounded-lg bg-white"
      />
    </div>
  );
}
