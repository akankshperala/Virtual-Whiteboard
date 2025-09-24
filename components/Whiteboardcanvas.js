"use client";
import { addstrokes, getstrokes } from "@/app/actions/useractions";
import { useRef, useEffect, useState } from "react";

export default function WhiteboardCanvas() {
  const canvasRef = useRef(null);
  const isdrawing = useRef(false)
  const [strokearr, setstrokearr] = useState([])
  const [iserasing, setiserasing] = useState(false)
  useEffect(() => {

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    // window.addEventListener("resize", () => {
    //   canvas.width = window.innerWidth;
    //   canvas.height = window.innerHeight;
    //   //   ctx.fillStyle = "white";
    //   //   ctx.fillRect(10, 20, 150, 50);
    // });

    canvas.width = window.innerWidth * 0.9;  // 90% of viewport width
    canvas.height = window.innerHeight * 0.8; // 80% of viewport height

    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const resizeCanvas = async () => {
      const points = await getstrokes()
      if (!points){return}
      ctx.strokeStyle = "black"
      console.log("points",points)
      points.forEach((pts, index) => {
        if(pts.length>0){console.log("pts",pts)
          ctx.beginPath()
          ctx.moveTo(pts[0].x,pts[0].y)
          pts.forEach((pt,i)=>{
            ctx.lineTo(pt.x,pt.y)
        })
        ctx.stroke()
      }
      });

    };

    // initial call
    resizeCanvas();
    // update on resize
    window.addEventListener("resize", resizeCanvas);
    canvas.addEventListener("mousedown", (e) => {
      isdrawing.current = true
      ctx.beginPath()
      ctx.strokeStyle = "black"
      ctx.moveTo(e.offsetX, e.offsetY)
      strokearr.push({ x: e.offsetX, y: e.offsetY })
    })
    canvas.addEventListener("mousemove", (e2) => {
      if (!isdrawing.current) { return }
      ctx.lineTo(e2.offsetX, e2.offsetY)
      strokearr.push({ x: e2.offsetX, y: e2.offsetY })
      ctx.stroke()
    })
    canvas.addEventListener("mouseup", async (e3) => {
      isdrawing.current = false
      console.log(strokearr)
      await addstrokes({color:( iserasing==true?"white":"black"),arr:strokearr})

      strokearr.splice(0, strokearr.length);
      // ctx.closePath()
    })
    return () => window.removeEventListener("resize", resizeCanvas);
  }, []);

  return (
    <div className="flex justify-center items-center w-full h-full">
      <div className="w-[90vw] h-[80vh] ">
        <canvas
          ref={canvasRef}
          className="cursor-crosshair border-2 ml-5 border-gray-300 rounded-lg"
        />
      </div>
    </div>
  );
}
