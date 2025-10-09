"use client";
import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef(null);
  const boxRef = useRef(null); // optional: for future bounding box logic

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particlesArray = [];
    let hue = 0;
    const mouse = { x: undefined, y: undefined };

    class Particle {
      constructor() {
        this.x = mouse.x;
        this.y = mouse.y;
        this.size = Math.random() * 15 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${hue},100%,50%)`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.2) this.size -= 0.1;
      }

      draw() {
        ctx.fillStyle = this.color;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    function handleParticles() {
      for (let i = 0; i < particlesArray.length; i++) {
        const p = particlesArray[i];
        p.update();
        p.draw();

        for (let j = i; j < particlesArray.length; j++) {
          const q = particlesArray[j];
          const dx = p.x - q.x;
          const dy = p.y - q.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 100) {
            ctx.beginPath();
            ctx.strokeStyle = p.color;
            ctx.lineWidth = 0.2;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
            ctx.closePath();
          }
        }

        if (p.size <= 0.3) {
          particlesArray.splice(i, 1);
          i--;
        }
      }
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      handleParticles();
      hue += 2;
      requestAnimationFrame(animate);
    }
    animate();

    function spawnParticles(e) {
      mouse.x = e.x;
      mouse.y = e.y;
      for (let i = 0; i < 8; i++) {
        particlesArray.push(new Particle());
      }
    }

    window.addEventListener("mousemove", spawnParticles);
    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });

    return () => {
      window.removeEventListener("mousemove", spawnParticles);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      id="canvas1"
      className="absolute top-0 left-0 w-full h-full bg-black"
    />
  );
}
