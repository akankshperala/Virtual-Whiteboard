import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { connectDB } from "./db.js";
import User from "@/models/User";

export async function verifySession() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    await connectDB();
    const user = await User.findById(decoded.id).select("-password");
    return user || null;
  } catch (err) {
    console.error("Invalid session:", err);
    return null;
  }
}
