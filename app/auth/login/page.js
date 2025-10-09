"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import ParticleBackground from "@/components/ParticleBackground";
import { signIn } from "next-auth/react";
import { FaGoogle, FaGithub } from "react-icons/fa";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
const handleGoogleLogin = () => {
  signIn("google", { callbackUrl: "/home" });
};

const handleGithubLogin = () => {
  signIn("github", { callbackUrl: "/home" });
};
  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
        credentials: "include", // ✅ important for cookies
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        alert(data.error || "Login failed");
        return;
      }

      router.push("/home");
    } catch (err) {
      setLoading(false);
      console.error(err);
      alert("Something went wrong");
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
          className="w-full max-w-md bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8"
        >
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
            Login to Your Account
          </h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
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
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-6">
            Don’t have an account?{" "}
            <a
              href="/auth/signup"
              className="text-indigo-600 font-semibold hover:underline"
            >
              Register
            </a>
          </p>
          <button
   onClick={handleGoogleLogin}
  className="flex items-center justify-center w-full py-3 rounded-xl bg-red-500 text-white hover:bg-red-600 transition"
>
  <FaGoogle className="mr-2" /> Sign in with Google
</button>

<button
 onClick={handleGithubLogin}
  className="flex items-center justify-center w-full py-3 rounded-xl bg-gray-800 text-white hover:bg-gray-900 transition"
>
  <FaGithub className="mr-2" /> Sign in with GitHub
</button>
        </motion.div>
      </div>
    </div>
  );
}
