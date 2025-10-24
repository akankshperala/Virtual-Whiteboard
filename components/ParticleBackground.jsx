"use client";
import { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    // --- 3D Starfield setup ---
    const numStars = 500;
    const stars = [];

    class Star {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = (Math.random() - 0.5) * width;
        this.y = (Math.random() - 0.5) * height;
        this.z = Math.random() * width;
        this.pz = this.z;
      }

      update() {
        this.z -= 3; // speed toward viewer
        if (this.z < 1) this.reset();
      }

      draw() {
        const sx = (this.x / this.z) * width + centerX;
        const sy = (this.y / this.z) * height + centerY;

        const r = Math.max(0, 3 * (1 - this.z / width));
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        // tail for motion
        const px = (this.x / this.pz) * width + centerX;
        const py = (this.y / this.pz) * height + centerY;
        ctx.strokeStyle = "white";
        ctx.lineWidth = r;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(sx, sy);
        ctx.stroke();

        this.pz = this.z;
      }
    }

    for (let i = 0; i < numStars; i++) stars.push(new Star());

    // --- Mouse interactive particles ---
    let particlesArray = [];
    let hue = 0;
    const mouse = { x: undefined, y: undefined };

    class Particle {
      constructor() {
        const spread = 30;
        this.x = mouse.x + (Math.random() - 0.5) * spread;
        this.y = mouse.y + (Math.random() - 0.5) * spread;
        this.size = Math.random() * 6 + 1;
        this.speedX = Math.random() * 3 - 1.5;
        this.speedY = Math.random() * 3 - 1.5;
        this.color = `hsl(${hue},100%,50%)`;
      }

      update() {
        this.x += this.speedX;
        this.y += this.speedY;
        if (this.size > 0.3) this.size -= 0.05;
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
            ctx.lineWidth = 0.5;
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

    function spawnParticles(e) {
      mouse.x = e.x;
      mouse.y = e.y;
      for (let i = 0; i < 2; i++) {
        particlesArray.push(new Particle());
      }
    }

    window.addEventListener("mousemove", spawnParticles);
    window.addEventListener("resize", () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    // --- Animation loop ---
    function animate() {
      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, width, height);

      stars.forEach(star => {
        star.update();
        star.draw();
      });

      handleParticles();
      hue += 4;
      requestAnimationFrame(animate);
    }
    animate();

    return () => {
      window.removeEventListener("mousemove", spawnParticles);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full"
    />
  );
}
