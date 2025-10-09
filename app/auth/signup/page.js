"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Something went wrong");
        return;
      }

      router.push("/auth/login");
    } catch (err) {
      console.error("Error:", err);
      alert("Failed to signup");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      <ParticleBackground />

      <div className="relative z-10 flex items-center justify-center min-h-screen">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Create an Account
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Full Name"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Email"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition"
            >
              Register
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Already have an account?{" "}
            <a
              href="/auth/login"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Login
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
