"use client";
import { useRef, useEffect } from "react";

export default function WhiteboardCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // window.addEventListener("resize", () => {
    //   canvas.width = window.innerWidth;
    //   canvas.height = window.innerHeight;
    //   //   ctx.fillStyle = "white";
    //   //   ctx.fillRect(10, 20, 150, 50);
    // });

    const resizeCanvas = () => {
      canvas.width = window.innerWidth * 0.8; // 90% of viewport width
      canvas.height = window.innerHeight * 0.9; // 80% of viewport height

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // initial call
    resizeCanvas();

    // update on resize
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-full">
      <canvas
        ref={canvasRef}
        className="cursor-crosshair border-2 ml-5 border-gray-300 rounded-lg"
      />
    </div>
  );
}
