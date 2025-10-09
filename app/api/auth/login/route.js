import { connectDB } from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookie from "cookie";

export async function POST(req) {
  const { email, password } = await req.json();
  await connectDB();

  const user = await User.findOne({ email });
  if (!user)
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return new Response(JSON.stringify({ error: "Invalid password" }), { status: 401 });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  return new Response(JSON.stringify({ message: "Login successful" }), {
    status: 200,
    headers: {
      "Set-Cookie": cookie.serialize("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }),
      "Content-Type": "application/json",
    },
  });
}
